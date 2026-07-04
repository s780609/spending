"use client";

import { useEffect, useState } from "react";

export interface DueItem {
  key: string;
  name: string;
  /** 「更換」或「檢查」 */
  action: string;
  /** 到期原因，如「已超出 1,200 km」「已超期 30 天」 */
  detail: string;
}

const STORAGE_KEY = "maintenance-alert:lastShown";

/**
 * 有保養項目到期時，每天第一次進入機車頁跳一次提醒。
 * 用 localStorage 記錄「上次提醒日期」達成一天一次；換日後若仍到期會再次提醒。
 */
export function MaintenanceAlert({
  dueItems,
  today,
}: {
  dueItems: DueItem[];
  today: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dueItems.length === 0) {
      return;
    }
    if (localStorage.getItem(STORAGE_KEY) === today) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, today);
    // localStorage 只能在 client 掛載後讀取，無法在 render 期間決定是否顯示
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [dueItems, today]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/40 p-0 sm:items-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-alert-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col rounded-t-2xl bg-white shadow-xl ring-1 ring-gray-950/10 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-950/5 px-6 py-4">
          <h2
            id="maintenance-alert-title"
            className="text-lg font-bold tracking-tight text-amber-600"
          >
            機車保養到期提醒
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            以下項目依里程／時間已到保養時機：
          </p>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {dueItems.map((item) => (
            <li
              key={item.key}
              className="rounded-lg bg-amber-50 px-3 py-2 text-sm ring-1 ring-inset ring-amber-500/20"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-950">{item.name}</span>
                <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {item.action}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-amber-700">{item.detail}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-950/5 px-6 py-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-full bg-gray-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
