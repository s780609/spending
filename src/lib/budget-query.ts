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

/**
 * 在 getBudgetStatus 之上，加上「歷史平均」推估的本月預估花費。
 * 因為發票/帳單明細通常延遲一個月才到，當月實際幾乎為 0，
 * 故以過去 lookback 個完整月份的每月平均，提早警示分類是否會超支。
 */
export async function getBudgetProjection(
  month: string,
  lookback = 3,
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

  // 過去 lookback 個完整月份（不含當月）的總花費 → 除以 lookback 得每月平均
  const history = await db
    .select({
      category: expenses.category,
      total: sql<number>`sum(${expenses.amount})::float`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, historyStart), lt(expenses.date, monthStart)))
    .groupBy(expenses.category);

  const spentByCategory = new Map(sums.map((r) => [r.category, r.total]));
  const avgByCategory = new Map(
    history.map((r) => [r.category, r.total / lookback]),
  );
  return computeBudgetProjection(rules, spentByCategory, avgByCategory);
}
