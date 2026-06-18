"use client";

import { useEffect, useState } from "react";
import type { BudgetStatus } from "@/lib/budget";

const STORAGE_KEY = "budget-alert:lastShown";

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString("zh-TW");
}

/**
 * 當月有分類超支時，每天第一次進入記帳頁跳一次提醒。
 * 用 localStorage 記錄「上次提醒日期」達成一天一次；換月後若仍超支會再次提醒，直到月底。
 */
export function BudgetAlert({
  overBudget,
  today,
}: {
  overBudget: BudgetStatus[];
  today: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (overBudget.length === 0) {
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) === today) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, today);
    // localStorage 只能在 client 掛載後讀取，無法在 render 期間決定是否顯示
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [overBudget, today]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="budget-alert-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-950/10"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="budget-alert-title"
          className="text-lg font-bold tracking-tight text-red-600"
        >
          本月預算超支提醒
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          以下分類本月花費已超出預算：
        </p>
        <ul className="mt-4 space-y-2">
          {overBudget.map((s) => (
            <li
              key={s.category}
              className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm ring-1 ring-inset ring-red-500/20"
            >
              <span className="font-medium text-gray-950">{s.category}</span>
              <span className="tabular-nums text-red-600">
                {formatAmount(s.spent)}
                <span className="text-gray-400"> / {formatAmount(s.budget)}</span>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-full bg-gray-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
