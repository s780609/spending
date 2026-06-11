"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { expenseItems, expenses } from "@/db/schema";
import { autoCategory } from "@/lib/auto-category";
import { AUTH_COOKIE, authToken } from "@/lib/auth";
import { DEFAULT_CATEGORY, isCategory } from "@/lib/categories";
import { parseEInvoiceCsv } from "@/lib/parse-einvoice";

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
