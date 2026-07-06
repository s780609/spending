"use server";

import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  notLike,
  sql,
  type SQL,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  bikeSettings,
  budgets,
  expenseItems,
  expenses,
  familyCardTransactions,
  familyTransactions,
  holdings,
  loans,
  maintenanceRecords,
  recurringExpenses,
} from "@/db/schema";
import { shiftMonth } from "@/lib/dates";
import {
  ENGINE_OIL_KEY,
  isMaintenanceItem,
} from "@/lib/maintenance";
import { getBikeSettings } from "@/lib/maintenance-query";
import { autoCategory } from "@/lib/auto-category";
import { AUTH_COOKIE, authToken } from "@/lib/auth";
import { DEFAULT_CATEGORY, isCategory } from "@/lib/categories";
import { todayTaipei } from "@/lib/dates";
import { isFamilyCategory } from "@/lib/family-category";
import { importBankStatement, importCardStatement } from "@/lib/family-import";
import { parseInvoiceCsv } from "@/lib/parse-einvoice";
import {
  detectStatementType,
  parseBankStatement,
  parseCardStatement,
} from "@/lib/parse-taishin";
import { extractPdfItems } from "@/lib/pdf-text";
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
  revalidatePath("/expenses");
}

export async function deleteExpense(id: number) {
  await getDb().delete(expenses).where(eq(expenses.id, id));
  revalidatePath("/expenses");
}

export async function updateExpenseCategory(id: number, category: string) {
  if (!isCategory(category)) {
    return;
  }
  await getDb().update(expenses).set({ category }).where(eq(expenses.id, id));
  revalidatePath("/expenses");
}

export async function addRecurring(formData: FormData) {
  const frequency =
    String(formData.get("frequency") ?? "monthly") === "yearly"
      ? "yearly"
      : "monthly";
  const dayOfMonth = Number(formData.get("dayOfMonth"));
  const monthOfYearRaw = Number(formData.get("monthOfYear"));
  const vendor = String(formData.get("vendor") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const categoryRaw = String(formData.get("category") ?? "");
  const endMonthRaw = String(formData.get("endMonth") ?? "");
  const endMonth = /^\d{4}-\d{2}$/.test(endMonthRaw) ? endMonthRaw : null;

  // 每年才需要月份；每月時固定存 null
  const monthOfYear =
    frequency === "yearly" &&
    Number.isInteger(monthOfYearRaw) &&
    monthOfYearRaw >= 1 &&
    monthOfYearRaw <= 12
      ? monthOfYearRaw
      : null;

  if (
    !Number.isInteger(dayOfMonth) ||
    dayOfMonth < 1 ||
    dayOfMonth > 31 ||
    (frequency === "yearly" && monthOfYear === null) ||
    !vendor ||
    !Number.isFinite(amount)
  ) {
    return;
  }

  await getDb()
    .insert(recurringExpenses)
    .values({
      frequency,
      dayOfMonth,
      monthOfYear,
      vendor,
      amount: String(amount),
      category: isCategory(categoryRaw) ? categoryRaw : DEFAULT_CATEGORY,
      lastGenerated: initialLastGenerated(
        dayOfMonth,
        todayTaipei(),
        frequency,
        monthOfYear,
      ),
      endMonth,
    });
  revalidatePath("/expenses/recurring");
}

export async function deleteRecurring(id: number) {
  await getDb()
    .delete(recurringExpenses)
    .where(eq(recurringExpenses.id, id));
  revalidatePath("/expenses/recurring");
}

export async function addBudget(formData: FormData) {
  const categoryRaw = String(formData.get("category") ?? "");
  const amount = Number(formData.get("amount"));

  if (!isCategory(categoryRaw) || !Number.isFinite(amount) || amount < 0) {
    return;
  }

  // 每個分類最多一筆，重複設定即更新金額
  await getDb()
    .insert(budgets)
    .values({ category: categoryRaw, amount: String(amount) })
    .onConflictDoUpdate({
      target: budgets.category,
      set: { amount: String(amount) },
    });
  revalidatePath("/expenses/budget");
  revalidatePath("/expenses");
}

export async function deleteBudget(id: number) {
  await getDb().delete(budgets).where(eq(budgets.id, id));
  revalidatePath("/expenses/budget");
  revalidatePath("/expenses");
}

export async function addMaintenanceRecord(formData: FormData) {
  const itemKey = String(formData.get("itemKey") ?? "");
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!isMaintenanceItem(itemKey) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }

  const db = getDb();
  const settings = await getBikeSettings();
  const oilRows = await db
    .select({ id: maintenanceRecords.id })
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.itemKey, ENGINE_OIL_KEY));
  // 換機油這筆會讓里程 +kmPerOilChange，故以「含本次」的次數估算當下里程
  const effectiveOilCount =
    itemKey === ENGINE_OIL_KEY ? oilRows.length + 1 : oilRows.length;
  const mileage =
    effectiveOilCount * settings.kmPerOilChange + settings.mileageAdjustment;

  await db.insert(maintenanceRecords).values({
    itemKey,
    date,
    mileage,
    note: note || null,
  });
  revalidatePath("/motorcycle");
}

export async function deleteMaintenanceRecord(id: number) {
  await getDb()
    .delete(maintenanceRecords)
    .where(eq(maintenanceRecords.id, id));
  revalidatePath("/motorcycle");
}

export async function saveBikeSettings(formData: FormData) {
  const startMonthRaw = String(formData.get("startMonth") ?? "");
  const startDate = /^\d{4}-\d{2}$/.test(startMonthRaw)
    ? `${startMonthRaw}-01`
    : null;

  const db = getDb();
  const settings = await getBikeSettings();

  // 目前里程 → 校正值：使估算里程恰等於使用者輸入的真實里程
  let mileageAdjustment = settings.mileageAdjustment;
  const currentMileageRaw = formData.get("currentMileage");
  const currentMileage = Number(currentMileageRaw);
  if (
    currentMileageRaw != null &&
    String(currentMileageRaw) !== "" &&
    Number.isFinite(currentMileage) &&
    currentMileage >= 0
  ) {
    const oilRows = await db
      .select({ id: maintenanceRecords.id })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.itemKey, ENGINE_OIL_KEY));
    mileageAdjustment =
      Math.round(currentMileage) - oilRows.length * settings.kmPerOilChange;
  }

  await db
    .insert(bikeSettings)
    .values({
      id: 1,
      startDate,
      kmPerOilChange: settings.kmPerOilChange,
      mileageAdjustment,
    })
    .onConflictDoUpdate({
      target: bikeSettings.id,
      set: { startDate, mileageAdjustment },
    });
  revalidatePath("/motorcycle");
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
  const collateralSymbol = String(formData.get("collateralSymbol") ?? "")
    .trim()
    .toUpperCase();
  const collateralShares = Number(formData.get("collateralShares"));
  const hasCollateral =
    type === "質押" &&
    collateralSymbol !== "" &&
    Number.isFinite(collateralShares) &&
    collateralShares > 0;

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
      collateralSymbol: hasCollateral ? collateralSymbol : null,
      collateralShares: hasCollateral ? String(collateralShares) : null,
    });
  revalidatePath("/assets");
}

export async function deleteLoan(id: number) {
  await getDb().delete(loans).where(eq(loans.id, id));
  revalidatePath("/assets");
}

export interface FamilyDetailRow {
  date: string;
  description: string;
  amount: number;
  category: string;
  origin: "帳戶" | "信用卡";
}

/** 圖表點擊用：撈指定來源/分類/月份區間的家庭支出明細（口徑與圖表一致） */
export async function getFamilySpendingDetail(params: {
  source: "all" | "bank" | "card";
  category?: string;
  /** YYYY-MM，空字串＝不限起點 */
  startMonth?: string;
  endMonth: string;
}): Promise<FamilyDetailRow[]> {
  if (!/^\d{4}-\d{2}$/.test(params.endMonth)) {
    return [];
  }
  const start =
    params.startMonth && /^\d{4}-\d{2}$/.test(params.startMonth)
      ? params.startMonth
      : null;
  const db = getDb();
  const rows: FamilyDetailRow[] = [];

  if (params.source !== "card") {
    const conds: SQL[] = [
      isNotNull(familyTransactions.withdrawal) as SQL,
      ne(familyTransactions.category, "內部轉帳"),
      lt(familyTransactions.date, `${shiftMonth(params.endMonth, 1)}-01`),
    ];
    if (start) {
      conds.push(gte(familyTransactions.date, `${start}-01`));
    }
    if (params.source === "all") {
      conds.push(ne(familyTransactions.category, "卡費"));
    }
    if (params.category) {
      conds.push(eq(familyTransactions.category, params.category));
    }
    const bank = await db
      .select()
      .from(familyTransactions)
      .where(and(...conds))
      .orderBy(asc(familyTransactions.date));
    rows.push(
      ...bank.map((r) => ({
        date: r.date,
        description: r.note ? `${r.description}（${r.note}）` : r.description,
        amount: Number(r.withdrawal),
        category: r.category,
        origin: "帳戶" as const,
      })),
    );
  }

  if (params.source !== "bank") {
    const monthExpr = sql`to_char(${familyCardTransactions.purchaseDate}, 'YYYY-MM')`;
    const conds: SQL[] = [
      notLike(familyCardTransactions.description, "%自動轉帳扣繳%"),
      sql`${monthExpr} <= ${params.endMonth}`,
    ];
    if (start) {
      conds.push(sql`${monthExpr} >= ${start}`);
    }
    if (params.category) {
      conds.push(eq(familyCardTransactions.category, params.category));
    }
    const card = await db
      .select()
      .from(familyCardTransactions)
      .where(and(...conds))
      .orderBy(asc(familyCardTransactions.purchaseDate));
    rows.push(
      ...card.map((r) => ({
        date: r.purchaseDate,
        description: r.description,
        amount: Number(r.amount),
        category: r.category,
        origin: "信用卡" as const,
      })),
    );
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows.slice(0, 500);
}

export interface ExpenseDetailRow {
  date: string;
  vendor: string;
  amount: number;
  category: string;
}

/** 圖表點擊用：撈指定分類/月份區間的個人支出明細 */
export async function getExpenseDetail(params: {
  category?: string;
  /** YYYY-MM，空字串＝不限起點 */
  startMonth?: string;
  endMonth: string;
}): Promise<ExpenseDetailRow[]> {
  if (!/^\d{4}-\d{2}$/.test(params.endMonth)) {
    return [];
  }
  const start =
    params.startMonth && /^\d{4}-\d{2}$/.test(params.startMonth)
      ? params.startMonth
      : null;
  const db = getDb();

  const conds: SQL[] = [
    lt(expenses.date, `${shiftMonth(params.endMonth, 1)}-01`),
  ];
  if (start) {
    conds.push(gte(expenses.date, `${start}-01`));
  }
  if (params.category) {
    conds.push(eq(expenses.category, params.category));
  }

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conds))
    .orderBy(asc(expenses.date))
    .limit(500);

  return rows.map((r) => ({
    date: r.date,
    vendor: r.vendor,
    amount: Number(r.amount),
    category: r.category,
  }));
}

export interface FamilyImportState {
  message: string;
  kind?: "bank" | "card";
  month?: string;
  inserted?: number;
  skipped?: number;
}

export async function importFamilyPdf(
  _prev: FamilyImportState,
  formData: FormData,
): Promise<FamilyImportState> {
  const file = formData.get("file");
  const password = String(formData.get("password") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) {
    return { message: "請先選擇 PDF 檔案" };
  }

  let pages;
  try {
    pages = await extractPdfItems(
      new Uint8Array(await file.arrayBuffer()),
      password || undefined,
    );
  } catch (error) {
    console.error("[importFamilyPdf] PDF 解析失敗：", error);
    if ((error as { name?: string })?.name === "PasswordException") {
      return { message: "PDF 密碼錯誤或未提供，請輸入正確的帳單密碼" };
    }
    return { message: "無法讀取 PDF，請確認檔案是否正確" };
  }

  const kind = detectStatementType(pages);
  if (kind === "bank") {
    const parsed = parseBankStatement(pages);
    if (!parsed.month || parsed.transactions.length === 0) {
      return { message: "解析不到對帳單明細，台新格式可能改版了" };
    }
    const counts = await importBankStatement(parsed);
    revalidatePath("/family");
    return {
      message: "綜合對帳單匯入完成",
      kind,
      month: parsed.month,
      ...counts,
    };
  }
  if (kind === "card") {
    const parsed = parseCardStatement(pages);
    if (!parsed.month || parsed.transactions.length === 0) {
      return { message: "解析不到信用卡明細，台新格式可能改版了" };
    }
    const counts = await importCardStatement(parsed);
    revalidatePath("/family");
    return {
      message: "信用卡帳單匯入完成",
      kind,
      month: parsed.month,
      ...counts,
    };
  }
  return { message: "無法辨識帳單種類（支援台新綜合對帳單與信用卡電子帳單）" };
}

export async function updateFamilyTransactionCategory(
  id: number,
  category: string,
) {
  if (!isFamilyCategory(category)) {
    return;
  }
  await getDb()
    .update(familyTransactions)
    .set({ category })
    .where(eq(familyTransactions.id, id));
  revalidatePath("/family");
}

export async function updateFamilyCardCategory(id: number, category: string) {
  if (!isFamilyCategory(category)) {
    return;
  }
  await getDb()
    .update(familyCardTransactions)
    .set({ category })
    .where(eq(familyCardTransactions.id, id));
  revalidatePath("/family");
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

  const { invoices, voidedCount, errors } = parseInvoiceCsv(await file.text());
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

  revalidatePath("/expenses");
  return {
    message: "匯入完成",
    imported,
    skipped: invoices.length - imported,
    voided: voidedCount,
    parseErrors: errors.length,
  };
}
