"use client";

import { useState, type ReactNode } from "react";

/** 區塊標題＋右上新增按鈕，點擊後表單下滑展開 */
export function AddPanel({
  title,
  buttonLabel,
  children,
}: {
  title: string;
  buttonLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-gray-950 dark:text-gray-50">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={
            open
              ? "rounded-full px-3 py-1 text-xs text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 hover:bg-gray-950/5 dark:hover:bg-white/5"
              : "rounded-full bg-gray-950 dark:bg-white px-3 py-1 text-xs font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900"
          }
        >
          {open ? "收合" : `＋ ${buttonLabel}`}
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </>
  );
}
