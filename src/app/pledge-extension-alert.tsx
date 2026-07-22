"use client";

import { useEffect, useState } from "react";

export interface PledgeExtensionItem {
  key: string;
  /** 借款名稱 */
  name: string;
  /** 展期期限 YYYY-MM-DD */
  deadline: string;
  /** 距離期限天數（負值代表已超期） */
  daysRemaining: number;
}

const STORAGE_KEY = "pledge-extension-alert:lastShown";

/** 距展期期限剩餘天數說明 */
function remainingText(days: number): string {
  if (days < 0) {
    return `已超期 ${-days} 天`;
  }
  if (days === 0) {
    return "今天到期";
  }
  return `剩 ${days} 天`;
}

/**
 * 質押借款接近展期期限時，每天第一次進入資產頁跳一次提醒。
 * 用 localStorage 記錄「上次提醒日期」達成一天一次；換日後若仍需展期會再次提醒。
 */
export function PledgeExtensionAlert({
  items,
  today,
}: {
  items: PledgeExtensionItem[];
  today: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) === today) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, today);
    // localStorage 只能在 client 掛載後讀取，無法在 render 期間決定是否顯示
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [items, today]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/40 dark:bg-black/60 p-0 sm:items-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pledge-extension-alert-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col rounded-t-2xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-950/10 dark:ring-white/10 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-950/5 dark:border-white/5 px-6 py-4">
          <h2
            id="pledge-extension-alert-title"
            className="text-lg font-bold tracking-tight text-violet-600"
          >
            質押展延提醒
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            以下質押借款自借貸日起每 6 個月須申請展期，期限將至：
          </p>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {items.map((item) => {
            const overdue = item.daysRemaining < 0;
            return (
              <li
                key={item.key}
                className={`rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${
                  overdue
                    ? "bg-red-50 dark:bg-red-950/20 ring-red-500/20 dark:ring-red-400/30"
                    : "bg-violet-50 dark:bg-violet-950/20 ring-violet-500/20 dark:ring-violet-400/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-gray-950 dark:text-gray-50">
                    {item.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      overdue
                        ? "bg-red-500/10 dark:bg-red-400/10 text-red-700 dark:text-red-400"
                        : "bg-violet-500/10 dark:bg-violet-400/10 text-violet-700 dark:text-violet-400"
                    }`}
                  >
                    {remainingText(item.daysRemaining)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 text-xs ${
                    overdue
                      ? "text-red-700 dark:text-red-400"
                      : "text-violet-700 dark:text-violet-400"
                  }`}
                >
                  展期期限 {item.deadline}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-gray-950/5 dark:border-white/5 px-6 py-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-full bg-gray-950 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
