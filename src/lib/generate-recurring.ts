import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, recurringExpenses } from "@/db/schema";
import { todayTaipei } from "./dates";
import { dueDates, type RecurringFrequency } from "./recurring";

/**
 * 補產生所有到期的定期支出（開頁時呼叫）。
 * 先以 lastGenerated 條件更新搶鎖，避免同時開兩個頁面重複產生。
 */
export async function generateRecurringExpenses(): Promise<void> {
  const db = getDb();
  const rules = await db.select().from(recurringExpenses);
  const today = todayTaipei();

  for (const rule of rules) {
    const dates = dueDates(
      rule.dayOfMonth,
      rule.lastGenerated,
      today,
      rule.endMonth,
      rule.frequency as RecurringFrequency,
      rule.monthOfYear,
    );
    if (dates.length === 0) {
      continue;
    }
    const claimed = await db
      .update(recurringExpenses)
      .set({ lastGenerated: dates[dates.length - 1].slice(0, 7) })
      .where(
        and(
          eq(recurringExpenses.id, rule.id),
          eq(recurringExpenses.lastGenerated, rule.lastGenerated),
        ),
      )
      .returning({ id: recurringExpenses.id });
    if (claimed.length === 0) {
      continue;
    }
    await db.insert(expenses).values(
      dates.map((date) => ({
        date,
        vendor: rule.vendor,
        amount: rule.amount,
        category: rule.category,
      })),
    );
  }
}
