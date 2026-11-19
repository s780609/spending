"use client";

import { useState, useTransition } from "react";
import {
  getFamilySpendingDetail,
  type FamilyDetailRow,
} from "@/app/actions";
import { categoryRows, MonthlyTrend, YearPicker } from "@/app/charts";
import {
  CARD,
  CategoryBars,
  ChangeBadge,
  monthStats,
  ntd,
  Pills,
  SpendingHero,
} from "@/app/spending-dashboard";
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

const SOURCE_LABELS = { all: "合併", bank: "帳戶", card: "信用卡" } as const;
const SOURCES = (Object.keys(SOURCE_LABELS) as FamilySource[]).map((value) => ({
  value,
  label: SOURCE_LABELS[value],
}));
const SCOPES = [
  { value: "month", label: "本月" },
  { value: "year", label: "年度" },
] as const;

/** 依月份加總 */
function monthlyTotals(entries: MonthCategoryEntry[]) {
  const byMonth = new Map<string, number>();
  for (const entry of entries) {
    byMonth.set(entry.month, (byMonth.get(entry.month) ?? 0) + entry.total);
  }
  return [...byMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function FamilyChartsPanel({
  bank,
  card,
  month,
  balance,
  cardNewCharges,
}: {
  bank: MonthCategoryEntry[];
  card: MonthCategoryEntry[];
  month: string;
  /** 最新對帳單存款與其月份 */
  balance: { amount: number; month: string } | null;
  /** 檢視月份卡單「本期新增」 */
  cardNewCharges: number | null;
}) {
  const [modal, setModal] = useState<{
    title: string;
    rows: FamilyDetailRow[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openDetail = (
    title: string,
    params: Parameters<typeof getFamilySpendingDetail>[0],
  ) => {
    startTransition(async () => {
      const rows = await getFamilySpendingDetail(params);
      setModal({ title, rows });
    });
  };

  const total = modal?.rows.reduce((s, r) => s + r.amount, 0) ?? 0;

  // 主卡一律用「合併」口徑；比例條拆帳戶（排除項後）／信用卡
  const merged = familyEntriesBySource(bank, card, "all");
  const stats = monthStats(monthlyTotals(merged), month);
  const mergedBank = familyEntriesBySource(bank, [], "all")
    .filter((e) => e.month === month)
    .reduce((s, e) => s + e.total, 0);
  const mergedCard = stats.current - mergedBank;

  const [trendSource, setTrendSource] = useState<FamilySource>("all");
  const trend = monthlyTotals(familyEntriesBySource(bank, card, trendSource));

  const [scope, setScope] = useState<"month" | "year">("month");
  const [source, setSource] = useState<FamilySource>("all");
  const [year, setYear] = useState(stats.year);
  const years = [...new Set([...merged.map((e) => e.month.slice(0, 4)), stats.year])]
    .sort()
    .reverse();
  const rows = categoryRows(
    familyEntriesBySource(bank, card, source),
    scope === "month" ? (m) => m === month : (m) => m.startsWith(`${year}-`),
  );
  const openCategory = (category: string) =>
    scope === "month"
      ? openDetail(`${month} · ${category} · ${SOURCE_LABELS[source]}`, {
          source,
          category,
          startMonth: month,
          endMonth: month,
        })
      : openDetail(`${year} 年 · ${category} · ${SOURCE_LABELS[source]}`, {
          source,
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
          [
            `目前存款 ${balance ? `${ntd(balance.amount)}（${balance.month} 對帳單）` : "—"}`,
            `卡費新增 ${cardNewCharges === null ? "—" : ntd(cardNewCharges)}`,
          ],
        ]}
        segments={[
          { key: "bank", label: "帳戶", value: mergedBank, color: "#8b5cf6" },
          { key: "card", label: "信用卡", value: mergedCard, color: "#3b82f6" },
        ]}
      />

      <section className={`mt-3 ${CARD}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">每月支出走勢</h2>
          <Pills options={SOURCES} value={trendSource} onChange={setTrendSource} />
        </div>
        <MonthlyTrend
          data={trend}
          onPointClick={(label) => {
            const isYear = /^\d{4}$/.test(label);
            openDetail(`${label} 支出 · ${SOURCE_LABELS[trendSource]}`, {
              source: trendSource,
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
          <Pills options={SOURCES} value={source} onChange={setSource} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pills options={SCOPES} value={scope} onChange={setScope} />
          {scope === "year" && years.length > 1 && (
            <>
              <span className="mx-1 h-4 w-px bg-gray-950/10 dark:bg-white/10" aria-hidden />
              <YearPicker years={years} value={year} onChange={setYear} />
            </>
          )}
        </div>
        <CategoryBars rows={rows} categories={FAMILY_CATEGORIES} onSelect={openCategory} />
      </section>

      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        帳戶口徑不含內部轉帳。「合併」＝帳戶（再排除利息、卡費、未分類、其他）＋信用卡（排除卡費），卡費改以信用卡明細逐筆計入。卡單依實際消費日歸月、退款以負數淨掉，僅排除「自動轉帳扣繳」繳款列。點圖表可查看對應明細。
      </p>

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
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ring-1 ring-inset ${
                        row.origin === "帳戶"
                          ? "bg-violet-50 text-violet-700 ring-violet-600/20"
                          : "bg-blue-50 text-blue-700 ring-blue-600/20"
                      }`}
                    >
                      {row.origin === "帳戶" ? "戶" : "卡"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-950 dark:text-gray-50">
                      {row.description}
                    </span>
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        row.amount < 0 ? "text-green-600" : "text-gray-950 dark:text-gray-50"
                      }`}
                    >
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
