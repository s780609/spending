import { and, asc, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { budgets, expenses } from "@/db/schema";
import {
  type BudgetProjection,
  type BudgetStatus,
  computeBudgetProjection,
  computeBudgetStatus,
} from "@/lib/budget";
import { shiftMonth } from "@/lib/dates";

/**
 * 撈出所有預算設定，並計算指定月份（YYYY-MM）各分類的花費與是否超支。
 * 沒有設定任何預算時回傳空陣列。
 */
export async function getBudgetStatus(month: string): Promise<BudgetStatus[]> {
  const db = getDb();

  const rules = await db
    .select()
    .from(budgets)
    .orderBy(asc(budgets.category), asc(budgets.id));
  if (rules.length === 0) {
    return [];
  }

  const sums = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.amount})::float`,
    })
    .from(expenses)
    .where(
      and(
        gte(expenses.date, `${month}-01`),
        lt(expenses.date, `${shiftMonth(month, 1)}-01`),
      ),
    )
    .groupBy(expenses.category);

  const spentByCategory = new Map(sums.map((r) => [r.category, r.total]));
  return computeBudgetStatus(rules, spentByCategory);
}

/** 預算投影／前 N 月視角預設回看的完整月份數（不含當月） */
export const BUDGET_LOOKBACK = 3;

/**
 * 在 getBudgetStatus 之上，加上以「前 N 個完整月（不含當月）」為基礎的兩種視角：
 * 因為發票/帳單明細通常延遲一個月才到、當月實際幾乎為 0，
 *  - 投影：用每月平均推估本月底花費，提早警示分類是否會爆當月預算；
 *  - 前 N 月：用實際總額對比「月預算 × N」，以完整資料檢視該段是否超支。
 */
export async function getBudgetProjection(
  month: string,
  lookback = BUDGET_LOOKBACK,
): Promise<BudgetProjection[]> {
  const db = getDb();

  const rules = await db
    .select()
    .from(budgets)
    .orderBy(asc(budgets.category), asc(budgets.id));
  if (rules.length === 0) {
    return [];
  }

  const monthStart = `${month}-01`;
  const nextMonthStart = `${shiftMonth(month, 1)}-01`;
  const historyStart = `${shiftMonth(month, -lookback)}-01`;

  // 當月實際（會延遲、通常偏低）
  const sums = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.amount})::float`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, monthStart), lt(expenses.date, nextMonthStart)))
    .groupBy(expenses.category);

  // 前 lookback 個完整月份（不含當月）的花費總額
  const history = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.amount})::float`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, historyStart), lt(expenses.date, monthStart)))
    .groupBy(expenses.category);

  const spentByCategory = new Map(sums.map((r) => [r.category, r.total]));
  const trailingByCategory = new Map(
    history.map((r) => [r.category, r.total]),
  );
  return computeBudgetProjection(
    rules,
    spentByCategory,
    trailingByCategory,
    lookback,
  );
}
