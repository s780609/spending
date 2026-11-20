import { shiftMonth } from "./dates";

/** 儀表板卡片外框樣式 */
export const CARD =
  "rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10";

export function ntd(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 本月 vs 上月、當年累計與月均（只算有資料的月份） */
export function monthStats(
  totals: { month: string; total: number }[],
  month: string,
) {
  const byMonth = new Map(totals.map((t) => [t.month, t.total]));
  const current = byMonth.get(month) ?? 0;
  const prev = byMonth.get(shiftMonth(month, -1));
  const year = month.slice(0, 4);
  const yearEntries = totals.filter((t) => t.month.startsWith(`${year}-`));
  const yearTotal = yearEntries.reduce((s, t) => s + t.total, 0);
  return {
    current,
    change: prev && prev > 0 ? (current - prev) / prev : null,
    year,
    yearTotal,
    monthlyAvg: yearEntries.length > 0 ? yearTotal / yearEntries.length : 0,
  };
}

/** 「月 × 分類」加總攤平成每月合計，依月份排序 */
export function monthlyTotals(
  entries: readonly { month: string; total: number }[],
): { month: string; total: number }[] {
  const byMonth = new Map<string, number>();
  for (const entry of entries) {
    byMonth.set(entry.month, (byMonth.get(entry.month) ?? 0) + entry.total);
  }
  return [...byMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** 取到指定月份為止的最近 n 個月合計（缺資料的月份補 0），給迷你折線圖用 */
export function lastMonths(
  totals: readonly { month: string; total: number }[],
  month: string,
  n: number,
): number[] {
  const byMonth = new Map(totals.map((t) => [t.month, t.total]));
  return Array.from({ length: n }, (_, i) => byMonth.get(shiftMonth(month, i - n + 1)) ?? 0);
}
