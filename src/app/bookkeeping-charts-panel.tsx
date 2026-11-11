"use client";

import { useState, useTransition } from "react";
import {
  getExpenseDetail,
  type ExpenseDetailRow,
} from "@/app/actions";
import {
  CategoryDonut,
  CategoryPie,
  colorOf,
  MonthlyTrend,
  YearPicker,
  yearMonthlyTotals,
} from "@/app/charts";
import { CATEGORIES } from "@/lib/categories";

const CARD =
  "rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10";

interface MonthCategoryEntry {
  month: string;
  category: string;
  total: number;
}

export function BookkeepingChartsPanel({
  categoryByMonth,
  trend,
  month,
}: {
  categoryByMonth: MonthCategoryEntry[];
  trend: { month: string; total: number }[];
  month: string;
}) {
  const [modal, setModal] = useState<{
    title: string;
    rows: ExpenseDetailRow[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openDetail = (
    title: string,
    params: Parameters<typeof getExpenseDetail>[0],
  ) => {
    startTransition(async () => {
      const rows = await getExpenseDetail(params);
      setModal({ title, rows });
    });
  };

  const total = modal?.rows.reduce((s, r) => s + r.amount, 0) ?? 0;

  const years = [...new Set(trend.map((entry) => entry.month.slice(0, 4)))]
    .sort()
    .reverse();
  const [year, setYear] = useState(month.slice(0, 4));
  const yearTrend = yearMonthlyTotals(trend, year);
  const yearTotal = yearTrend.reduce((s, entry) => s + entry.total, 0);
  const yearSums = new Map<string, number>();
  for (const entry of categoryByMonth) {
    if (entry.month.startsWith(`${year}-`)) {
      yearSums.set(entry.category, (yearSums.get(entry.category) ?? 0) + entry.total);
    }
  }
  const yearRows = [...yearSums.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((row) => Math.round(row.value) !== 0)
    .sort((a, b) => b.value - a.value);
  const positiveTotal = yearRows.reduce((s, r) => s + Math.max(r.value, 0), 0);
  const openYearCategory = (category: string) =>
    openDetail(`${year} 年 · ${category}`, {
      category,
      startMonth: `${year}-01`,
      endMonth: `${year}-12`,
    });

  return (
    <>
      <section className={`mt-6 ${CARD}`}>
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">
          {month} 分類佔比
        </h2>
        <CategoryPie
          data={categoryByMonth}
          month={month}
          fixedMonths={1}
          onSliceClick={(category) =>
            openDetail(`${month} · ${category}`, {
              category,
              startMonth: month,
              endMonth: month,
            })
          }
        />
      </section>

      <section className={`mt-3 ${CARD}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">
            年度 · NT$ {Math.round(yearTotal).toLocaleString("zh-TW")}
          </h2>
          <YearPicker years={years} value={year} onChange={setYear} />
        </div>
        <div className="mt-2 grid items-center gap-3 sm:grid-cols-2">
          <CategoryDonut
            data={yearRows}
            categories={CATEGORIES}
            onSliceClick={openYearCategory}
            showLegend={false}
          />
          {yearRows.length > 0 && (
            <ul className="space-y-0.5">
              {yearRows.map((row) => {
                const share =
                  positiveTotal > 0 ? Math.max(row.value, 0) / positiveTotal : 0;
                return (
                  <li key={row.name}>
                    <button
                      type="button"
                      onClick={() => openYearCategory(row.name)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-950/5 dark:hover:bg-white/5"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: colorOf(row.name, CATEGORIES) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-gray-950 dark:text-gray-50">
                        {row.name}
                      </span>
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-400 dark:text-gray-500">
                        {(share * 100).toFixed(1)}%
                      </span>
                      <span className="w-24 shrink-0 text-right tabular-nums font-medium text-gray-950 dark:text-gray-50">
                        {Math.round(row.value).toLocaleString("zh-TW")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {yearTrend.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs text-gray-500 dark:text-gray-400">每月支出</h3>
            <MonthlyTrend
              data={yearTrend}
              yearView
              onPointClick={(label) =>
                openDetail(`${label} 全部支出`, {
                  startMonth: label,
                  endMonth: label,
                })
              }
            />
          </div>
        )}
      </section>

      {(modal || isPending) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/40 dark:bg-black/60 p-0 sm:items-center sm:p-6"
          onClick={() => setModal(null)}
        >
          <div
            className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white dark:bg-gray-900 shadow-xl sm:max-w-lg sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-950/5 dark:border-white/5 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-950 dark:text-gray-50">
                  {isPending ? "讀取中…" : modal?.title}
                </p>
                {modal && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {modal.rows.length} 筆 · 合計 NT${" "}
                    {Math.round(total).toLocaleString("zh-TW")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="shrink-0 rounded-full px-3 py-1 text-sm text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 hover:bg-gray-950/5 dark:hover:bg-white/5"
              >
                關閉
              </button>
            </div>
            <ul className="flex-1 divide-y divide-gray-950/5 overflow-y-auto px-4">
              {!isPending && modal?.rows.length === 0 && (
                <li className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  沒有符合的明細
                </li>
              )}
              {!isPending &&
                modal?.rows.map((row, index) => (
                  <li key={index} className="flex items-center gap-3 py-2.5">
                    <span className="shrink-0 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {row.date.slice(5).replace("-", "/")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-950 dark:text-gray-50">
                      {row.vendor}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-gray-950 dark:text-gray-50">
                      {Math.round(row.amount).toLocaleString("zh-TW")}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
