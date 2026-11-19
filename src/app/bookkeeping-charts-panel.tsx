"use client";

import { useState, useTransition } from "react";
import {
  getExpenseDetail,
  type ExpenseDetailRow,
} from "@/app/actions";
import {
  categoryRows,
  MonthlyTrend,
  YearPicker,
} from "@/app/charts";
import {
  CARD,
  CategoryBars,
  ChangeBadge,
  monthStats,
  ntd,
  Pills,
  SpendingHero,
} from "@/app/spending-dashboard";
import { CATEGORIES } from "@/lib/categories";

interface MonthCategoryEntry {
  month: string;
  category: string;
  total: number;
}

const SCOPES = [
  { value: "month", label: "本月" },
  { value: "year", label: "年度" },
] as const;

export function BookkeepingChartsPanel({
  categoryByMonth,
  trend,
  month,
  budget,
}: {
  categoryByMonth: MonthCategoryEntry[];
  trend: { month: string; total: number }[];
  month: string;
  /** 檢視月份有設預算的分類：預算合計與已花費合計；沒設預算為 null */
  budget: { budget: number; spent: number } | null;
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

  const stats = monthStats(trend, month);
  const years = [...new Set([...trend.map((entry) => entry.month.slice(0, 4)), stats.year])]
    .sort()
    .reverse();
  const [scope, setScope] = useState<"month" | "year">("month");
  const [year, setYear] = useState(stats.year);
  const rows =
    scope === "month"
      ? categoryRows(categoryByMonth, (m) => m === month)
      : categoryRows(categoryByMonth, (m) => m.startsWith(`${year}-`));
  const openCategory = (category: string) =>
    scope === "month"
      ? openDetail(`${month} · ${category}`, {
          category,
          startMonth: month,
          endMonth: month,
        })
      : openDetail(`${year} 年 · ${category}`, {
          category,
          startMonth: `${year}-01`,
          endMonth: `${year}-12`,
        });

  return (
    <>
      <SpendingHero
        label={`${month} 支出`}
        value={stats.current}
        lines={[
          [
            <ChangeBadge key="c" change={stats.change} />,
            `${stats.year} 年累計 ${ntd(stats.yearTotal)}`,
            `月均 ${ntd(stats.monthlyAvg)}`,
          ],
        ]}
        meter={
          budget && budget.budget > 0
            ? {
                ratio: budget.spent / budget.budget,
                label: `預算使用 ${((budget.spent / budget.budget) * 100).toFixed(1)}%（${ntd(budget.spent)} / ${ntd(budget.budget)}）`,
              }
            : undefined
        }
      />

      <section className={`mt-3 ${CARD}`}>
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">每月支出走勢</h2>
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

      <section className={`mt-3 ${CARD}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">
            分類
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              {scope === "month" ? month : `${year} 年`}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pills options={SCOPES} value={scope} onChange={setScope} />
            {scope === "year" && years.length > 1 && (
              <>
                <span className="mx-1 h-4 w-px bg-gray-950/10 dark:bg-white/10" aria-hidden />
                <YearPicker years={years} value={year} onChange={setYear} />
              </>
            )}
          </div>
        </div>
        <CategoryBars rows={rows} categories={CATEGORIES} onSelect={openCategory} />
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
