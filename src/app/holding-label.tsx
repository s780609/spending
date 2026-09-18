"use client";

import { useState } from "react";

/** 持股明細的名稱區：預設只顯示名稱／代號／券商，點一下才展開現價 */
export function HoldingLabel({
  name,
  symbol,
  broker,
  priceText,
}: {
  name: string | null;
  symbol: string;
  broker: string;
  priceText: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      title={open ? "收合現價" : "顯示現價"}
      className="min-w-0 flex-1 text-left sm:order-2"
    >
      <span className="block truncate text-sm text-gray-950 dark:text-gray-50">
        {name || symbol}
        <span className="ml-1 font-mono text-xs text-gray-400 dark:text-gray-500">
          {symbol}
        </span>
        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
          · {broker}
        </span>
        <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
          {open ? "▲" : "▼"}
        </span>
      </span>
      {open && (
        <span className="block text-xs text-gray-400 dark:text-gray-500">
          現價 {priceText}
        </span>
      )}
    </button>
  );
}
