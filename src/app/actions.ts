"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  expenseItems,
  expenses,
  holdings,
  loans,
  recurringExpenses,
} from "@/db/schema";
import { autoCategory } from "@/lib/auto-category";
import { AUTH_COOKIE, authToken } from "@/lib/auth";
import { DEFAULT_CATEGORY, isCategory } from "@/lib/categories";
import { todayTaipei } from "@/lib/dates";
import { parseEInvoiceCsv } from "@/lib/parse-einvoice";
import { initialLastGenerated } from "@/lib/recurring";

export async function login(formData: FormData) {
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    !process.env.APP_PASSWORD ||
    password !== process.env.APP_PASSWORD
  ) {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await authToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}

export async function addExpense(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const vendor = String(formData.get("vendor") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const categoryRaw = String(formData.get("category") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !vendor || !Number.isFinite(amount)) {
    return;
  }

  await getDb()
    .insert(expenses)
    .values({
      date,
      vendor,
      amount: String(amount),
      category: isCategory(categoryRaw) ? categoryRaw : DEFAULT_CATEGORY,
    });
  revalidatePath("/");
}

export async function deleteExpense(id: number) {
  await getDb().delete(expenses).where(eq(expenses.id, id));
  revalidatePath("/");
}

export async function updateExpenseCategory(id: number, category: string) {
  if (!isCategory(category)) {
    return;
  }
  await getDb().update(expenses).set({ category }).where(eq(expenses.id, id));
  revalidatePath("/");
}

export async function addRecurring(formData: FormData) {
  const dayOfMonth = Number(formData.get("dayOfMonth"));
  const vendor = String(formData.get("vendor") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const categoryRaw = String(formData.get("category") ?? "");
  const endMonthRaw = String(formData.get("endMonth") ?? "");
  const endMonth = /^\d{4}-\d{2}$/.test(endMonthRaw) ? endMonthRaw : null;

  if (
    !Number.isInteger(dayOfMonth) ||
    dayOfMonth < 1 ||
    dayOfMonth > 31 ||
    !vendor ||
    !Number.isFinite(amount)
  ) {
    return;
  }

  await getDb()
    .insert(recurringExpenses)
    .values({
      dayOfMonth,
      vendor,
      amount: String(amount),
      category: isCategory(categoryRaw) ? categoryRaw : DEFAULT_CATEGORY,
      lastGenerated: initialLastGenerated(dayOfMonth, todayTaipei()),
      endMonth,
    });
  revalidatePath("/recurring");
}

export async function deleteRecurring(id: number) {
  await getDb()
    .delete(recurringExpenses)
    .where(eq(recurringExpenses.id, id));
  revalidatePath("/recurring");
}

export async function addHolding(formData: FormData) {
  const market = String(formData.get("market") ?? "");
  const broker = String(formData.get("broker") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const shares = Number(formData.get("shares"));

  if (
    !["TW", "US"].includes(market) ||
    !broker ||
    !symbol ||
    !Number.isFinite(shares) ||
    shares <= 0
  ) {
    return;
  }

  await getDb()
    .insert(holdings)
    .values({
      market,
      broker,
      symbol,
      name: name || null,
      shares: String(shares),
    });
  revalidatePath("/assets");
}

export async function updateHoldingShares(id: number, shares: number) {
  if (!Number.isFinite(shares) || shares <= 0) {
    return;
  }
  await getDb()
    .update(holdings)
    .set({ shares: String(shares) })
    .where(eq(holdings.id, id));
  revalidatePath("/assets");
}

export async function deleteHolding(id: number) {
  await getDb().delete(holdings).where(eq(holdings.id, id));
  revalidatePath("/assets");
}

export async function addLoan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const principal = Number(formData.get("principal"));
  const annualRate = Number(formData.get("annualRate"));
  const startDate = String(formData.get("startDate") ?? "");
  const installmentsRaw = Number(formData.get("installments"));
  const termEndRaw = String(formData.get("termEnd") ?? "");

  if (
    !name ||
    !["質押", "信貸"].includes(type) ||
    !Number.isFinite(principal) ||
    principal <= 0 ||
    !Number.isFinite(annualRate) ||
    annualRate < 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
  ) {
    return;
  }
  const installments =
    type === "信貸" && Number.isInteger(installmentsRaw) && installmentsRaw > 0
      ? installmentsRaw
      : null;
  if (type === "信貸" && installments === null) {
    return;
  }

  await getDb()
    .insert(loans)
    .values({
      name,
      type,
      principal: String(principal),
      annualRate: String(annualRate),
      startDate,
      installments,
      termEnd: /^\d{4}-\d{2}-\d{2}$/.test(termEndRaw) ? termEndRaw : null,
    });
  revalidatePath("/assets");
}

export async function deleteLoan(id: number) {
  await getDb().delete(loans).where(eq(loans.id, id));
  revalidatePath("/assets");
}

export interface ImportState {
  message: string;
  imported?: number;
  skipped?: number;
  voided?: number;
  parseErrors?: number;
}

export async function importCsv(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "請先選擇 CSV 檔案" };
  }

  const { invoices, voidedCount, errors } = parseEInvoiceCsv(await file.text());
  if (invoices.length === 0) {
    return {
      message: "檔案裡沒有可匯入的發票，請確認是電子發票消費明細 CSV",
      voided: voidedCount,
      parseErrors: errors.length,
    };
  }

  const db = getDb();
  const existing = await db
    .select({ invoiceNumber: expenses.invoiceNumber })
    .from(expenses)
    .where(
      inArray(
        expenses.invoiceNumber,
        invoices.map((invoice) => invoice.invoiceNumber),
      ),
    );
  const existingNumbers = new Set(existing.map((row) => row.invoiceNumber));

  let imported = 0;
  for (const invoice of invoices) {
    if (existingNumbers.has(invoice.invoiceNumber)) {
      continue;
    }
    const [inserted] = await db
      .insert(expenses)
      .values({
        date: invoice.date,
        vendor: invoice.sellerName,
        amount: String(invoice.totalAmount),
        category: autoCategory(
          invoice.sellerName,
          invoice.items.map((item) => item.name),
        ),
        invoiceNumber: invoice.invoiceNumber,
      })
      .returning({ id: expenses.id });
    if (invoice.items.length > 0) {
      await db.insert(expenseItems).values(
        invoice.items.map((item) => ({
          expenseId: inserted.id,
          name: item.name,
          amount: String(item.amount),
        })),
      );
    }
    // 同一份檔案內重複的發票號碼也要去重，避免撞 UNIQUE 約束
    existingNumbers.add(invoice.invoiceNumber);
    imported += 1;
  }

  revalidatePath("/");
  return {
    message: "匯入完成",
    imported,
    skipped: invoices.length - imported,
    voided: voidedCount,
    parseErrors: errors.length,
  };
}
