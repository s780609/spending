"use client";

import { useState } from "react";
import {
  ACTIVE_PILL,
  CategoryBreakdown,
  IDLE_PILL,
  MonthlyTrend,
  YearPicker,
  yearMonthlyTotals,
} from "@/app/charts";
import {
  FAMILY_CATEGORIES,
  familyEntriesBySource,
  type FamilySource,
} from "@/lib/family-category";

interface MonthCategoryEntry {
  month: string;
  category: string;
  total: number;
}

const SOURCE_LABELS: Record<FamilySource, string> = {
  all: "合併",
  bank: "帳戶",
  card: "信用卡",
};

function fmt(value: number): string {
  return Math.round(value).toLocaleString("zh-TW");
}

/** 家庭年度總支出＋分類圓餅圖＋每月線圖；年份預設為目前檢視月份所屬年度，可點選切換 */
export function FamilyYearSummary({
  bank,
  card,
  initialYear,
  onDetail,
}: {
  bank: MonthCategoryEntry[];
  card: MonthCategoryEntry[];
  /** YYYY */
  initialYear: string;
  /** 點分類查該年度明細 */
  onDetail: (params: {
    source: FamilySource;
    category?: string;
    startMonth: string;
    endMonth: string;
    title: string;
  }) => void;
}) {
  const [year, setYear] = useState(initialYear);
  const [source, setSource] = useState<FamilySource>("all");

  const years = [
    ...new Set([...bank, ...card].map((entry) => entry.month.slice(0, 4))),
    initialYear,
  ];
  const yearOptions = [...new Set(years)].sort().reverse();

  const entries = familyEntriesBySource(bank, card, source).filter((entry) =>
    entry.month.startsWith(`${year}-`),
  );
  const sums = new Map<string, number>();
  const months = new Set<string>();
  const byMonth = new Map<string, number>();
  for (const entry of entries) {
    sums.set(entry.category, (sums.get(entry.category) ?? 0) + entry.total);
    months.add(entry.month);
    byMonth.set(entry.month, (byMonth.get(entry.month) ?? 0) + entry.total);
  }
  const yearTrend = yearMonthlyTotals(
    [...byMonth.entries()].map(([month, total]) => ({ month, total })),
    year,
  );
  const total = [...sums.values()].reduce((s, v) => s + v, 0);
  const rows = [...sums.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((row) => Math.round(row.value) !== 0)
    .sort((a, b) => b.value - a.value);
  const sortedMonths = [...months].sort();
  const coverage =
    sortedMonths.length === 0
      ? null
      : sortedMonths.length === 1
        ? `${Number(sortedMonths[0].slice(5))} 月`
        : `${Number(sortedMonths[0].slice(5))}–${Number(sortedMonths[sortedMonths.length - 1].slice(5))} 月`;

  const openCategory = (category?: string) =>
    onDetail({
      source,
      category,
      startMonth: `${year}-01`,
      endMonth: `${year}-12`,
      title: `${year} 年 · ${category ?? "全部分類"} · ${SOURCE_LABELS[source]}`,
    });

  return (
    <section className="mt-3 rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">
          年度
        </h2>
        <YearPicker years={yearOptions} value={year} onChange={setYear} />
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {year} 年總支出
          </p>
          <button
            type="button"
            onClick={() => openCategory()}
            className="mt-1 block text-left text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 hover:underline decoration-gray-300 dark:decoration-gray-600 underline-offset-4"
          >
            NT$ {fmt(total)}
          </button>
          {coverage && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {coverage}，共 {sortedMonths.length} 個月 · 月均 NT${" "}
              {fmt(total / sortedMonths.length)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SOURCE_LABELS) as FamilySource[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSource(option)}
              className={source === option ? ACTIVE_PILL : IDLE_PILL}
            >
              {SOURCE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <CategoryBreakdown
        rows={rows}
        categories={FAMILY_CATEGORIES}
        onSelect={openCategory}
      />

      {yearTrend.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs text-gray-500 dark:text-gray-400">每月支出</h3>
          <MonthlyTrend
            data={yearTrend}
            yearView
            onPointClick={(label) =>
              onDetail({
                source,
                startMonth: label,
                endMonth: label,
                title: `${label} 支出 · ${SOURCE_LABELS[source]}`,
              })
            }
          />
        </div>
      )}
    </section>
  );
}
