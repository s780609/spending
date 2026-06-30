import { shiftMonth } from "./dates";

/** 定期支出頻率：monthly＝每月、yearly＝每年 */
export type RecurringFrequency = "monthly" | "yearly";

/** 規則在某月的到期日，日數超過該月天數時取月底（如 31 號遇 2 月 → 2/28） */
function dueDateInMonth(month: string, dayOfMonth: number): string {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

/**
 * 回傳 lastGenerated（YYYY-MM）之後、截至 today（YYYY-MM-DD）
 * 所有已到期而尚未產生的日期，由舊到新。
 * endMonth（YYYY-MM，含當月）之後的月份不產生；null 表示無期限。
 * frequency＝yearly 時只在月份等於 monthOfYear（1-12）時產生，達成一年一次。
 */
export function dueDates(
  dayOfMonth: number,
  lastGenerated: string,
  today: string,
  endMonth?: string | null,
  frequency: RecurringFrequency = "monthly",
  monthOfYear?: number | null,
): string[] {
  const currentMonth = today.slice(0, 7);
  const result: string[] = [];
  for (
    let month = shiftMonth(lastGenerated, 1);
    month <= currentMonth;
    month = shiftMonth(month, 1)
  ) {
    if (endMonth && month > endMonth) {
      break;
    }
    if (frequency === "yearly" && Number(month.slice(5, 7)) !== monthOfYear) {
      continue;
    }
    const due = dueDateInMonth(month, dayOfMonth);
    if (due <= today) {
      result.push(due);
    }
  }
  return result;
}

/**
 * 建立規則時的 lastGenerated 初始值（以「下次到期月份」為基準）：
 * 該月到期日已過 → 該月（從下個月開始產生）；
 * 尚未到或就是今天 → 上一個月（到期當天立即產生）。
 * 每月＝以本月為基準；每年＝以今年的 monthOfYear 月為基準。
 */
export function initialLastGenerated(
  dayOfMonth: number,
  today: string,
  frequency: RecurringFrequency = "monthly",
  monthOfYear?: number | null,
): string {
  const anchorMonth =
    frequency === "yearly" && monthOfYear
      ? `${today.slice(0, 4)}-${String(monthOfYear).padStart(2, "0")}`
      : today.slice(0, 7);
  const due = dueDateInMonth(anchorMonth, dayOfMonth);
  return due < today ? anchorMonth : shiftMonth(anchorMonth, -1);
}
