import { shiftMonth } from "./dates";

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
 */
export function dueDates(
  dayOfMonth: number,
  lastGenerated: string,
  today: string,
): string[] {
  const currentMonth = today.slice(0, 7);
  const result: string[] = [];
  for (
    let month = shiftMonth(lastGenerated, 1);
    month <= currentMonth;
    month = shiftMonth(month, 1)
  ) {
    const due = dueDateInMonth(month, dayOfMonth);
    if (due <= today) {
      result.push(due);
    }
  }
  return result;
}

/**
 * 建立規則時的 lastGenerated 初始值：
 * 本月到期日已過 → 本月（從下個月開始產生）；
 * 尚未到或就是今天 → 上個月（到期當天立即產生）。
 */
export function initialLastGenerated(
  dayOfMonth: number,
  today: string,
): string {
  const currentMonth = today.slice(0, 7);
  const due = dueDateInMonth(currentMonth, dayOfMonth);
  return due < today ? currentMonth : shiftMonth(currentMonth, -1);
}
