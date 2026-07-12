"use client";

import { useState, useTransition } from "react";
import {
  getExpenseDetail,
  type ExpenseDetailRow,
} from "@/app/actions";
import { CategoryPie, MonthlyTrend } from "@/app/charts";

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

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {categoryByMonth.length > 0 && (
          <section className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10">
            <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">分類佔比</h2>
            <CategoryPie
              data={categoryByMonth}
              month={month}
              onSliceClick={(category, startMonth, endMonth) => {
                const range =
                  startMonth && startMonth !== endMonth
                    ? `${startMonth} ～ ${endMonth}`
                    : startMonth
                      ? endMonth
                      : `～ ${endMonth}（全部）`;
                openDetail(`${range} · ${category}`, {
                  category,
                  startMonth: startMonth || undefined,
                  endMonth,
                });
              }}
            />
          </section>
        )}
        {trend.length > 0 && (
          <section className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10">
            <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">每月支出趨勢</h2>
            <MonthlyTrend
              data={trend}
              onPointClick={(label) => {
                const isYear = /^\d{4}$/.test(label);
                openDetail(`${label} 全部支出`, {
                  startMonth: isYear ? `${label}-01` : label,
                  endMonth: isYear ? `${label}-12` : label,
                });
              }}
            />
          </section>
        )}
      </div>

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
