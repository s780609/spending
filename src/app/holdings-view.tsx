"use client";

import { useState, type ReactNode } from "react";

const VIEWS = [
  { key: "summary", label: "依代號彙總" },
  { key: "detail", label: "持股明細" },
] as const;

export type HoldingsViewKey = (typeof VIEWS)[number]["key"];

/** 持股區塊：分段式切換「依代號彙總」與「持股明細」，一次只顯示一種以縮短頁面高度 */
export function HoldingsView({
  defaultView,
  summary,
  detail,
}: {
  defaultView: HoldingsViewKey;
  summary: ReactNode;
  detail: ReactNode;
}) {
  const [view, setView] = useState<HoldingsViewKey>(defaultView);

  return (
    <>
      <div
        role="tablist"
        className="mt-4 flex w-full rounded-full bg-gray-950/[0.04] dark:bg-white/[0.04] p-1 ring-1 ring-inset ring-gray-950/5 dark:ring-white/5 sm:w-fit"
      >
        {VIEWS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === view}
            onClick={() => setView(tab.key)}
            className={`flex-1 rounded-full px-4 py-1.5 text-center text-xs whitespace-nowrap sm:flex-none ${
              tab.key === view
                ? "bg-white dark:bg-gray-900 font-semibold text-gray-950 dark:text-gray-50 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10"
                : "font-medium text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {view === "summary" ? summary : detail}
    </>
  );
}
