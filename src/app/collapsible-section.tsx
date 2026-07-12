"use client";

import { useState, type ReactNode } from "react";

/** 區塊小標題＋右側收合按鈕，預設展開，內容下滑收合 */
export function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-950 dark:text-gray-50">{title}</h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full px-3 py-1 text-xs text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 hover:bg-gray-950/5 dark:hover:bg-white/5"
        >
          {open ? "收合" : "展開"}
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
