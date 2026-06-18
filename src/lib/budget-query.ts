import { and, asc, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { budgets, expenses } from "@/db/schema";
import { type BudgetStatus, computeBudgetStatus } from "@/lib/budget";
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
