"use client";

import { useState, useTransition } from "react";
import {
  getFamilySpendingDetail,
  type FamilyDetailRow,
} from "@/app/actions";
import { FamilySpendingPie } from "@/app/charts";
import { FamilyYearSummary } from "@/app/family-year-summary";
import { FAMILY_CATEGORIES } from "@/lib/family-category";

const CARD =
  "rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10";

interface MonthCategoryEntry {
  month: string;
  category: string;
  total: number;
}

const SOURCE_LABELS = { all: "合併", bank: "帳戶", card: "信用卡" } as const;

export function FamilyChartsPanel({
  bank,
  card,
  month,
}: {
  bank: MonthCategoryEntry[];
  card: MonthCategoryEntry[];
  month: string;
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

  return (
    <>
      <section className={`mt-6 ${CARD}`}>
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">
          {month} 分類佔比
        </h2>
        <FamilySpendingPie
          bank={bank}
          card={card}
          month={month}
          categories={FAMILY_CATEGORIES}
          fixedMonths={1}
          onDetail={(p) =>
            openDetail(
              `${month} · ${p.category} · ${SOURCE_LABELS[p.source]}`,
              p,
            )
          }
        />
      </section>
      <FamilyYearSummary
        key={month.slice(0, 4)}
        bank={bank}
        card={card}
        initialYear={month.slice(0, 4)}
        onDetail={({ title, ...params }) => openDetail(title, params)}
      />
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
