"use client";

import { useState } from "react";
import { ACTIVE_PILL, IDLE_PILL } from "@/app/charts";
import type { AssetSummary } from "@/lib/asset-dashboard";

const MARKET_LABEL: Record<string, string> = { TW: "台股", US: "美股" };
const MARKET_BAR: Record<string, string> = {
  TW: "bg-red-500",
  US: "bg-blue-500",
};

function ntd(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function usd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CARD =
  "rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10";

/** 淨資產主卡：淨資產大字、總資產／總負債／槓桿一行、負債佔總資產量條 */
export function NetWorthHero({
  totalAssets,
  totalLiabilities,
  netWorth,
  leverage,
}: {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  leverage: number | null;
}) {
  const ratio = totalAssets > 0 ? totalLiabilities / totalAssets : null;
  // 淨資產為負時比率會超過 100%，條圖填滿即可，數字照實顯示
  const fillPct = ratio === null ? 0 : Math.min(100, Math.max(0, ratio * 100));

  return (
    <section className={`mt-4 ${CARD}`}>
      <p className="text-xs text-gray-600 dark:text-gray-400">淨資產</p>
      <p className="sensitive mt-1 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
        {ntd(netWorth)}
      </p>
      <p className="sensitive mt-1 text-xs text-gray-600 dark:text-gray-400">
        總資產 {ntd(totalAssets)} − 總負債 {ntd(totalLiabilities)} · 槓桿{" "}
        {leverage === null ? "—" : leverage.toFixed(2)}
      </p>
      <div className="sensitive mt-4 flex h-2 gap-0.5">
        {fillPct > 0 && (
          <div className="rounded-full bg-sky-500" style={{ width: `${fillPct}%` }} />
        )}
        {fillPct < 100 && <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />}
      </div>
      <p className="sensitive mt-1.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
        <span className="h-2 w-2 rounded-full bg-sky-500" />
        負債佔總資產 {ratio === null ? "—" : pct(ratio)}
      </p>
    </section>
  );
}

/** 水平長條圖：條長以最大值為準，顏色依市場 */
function BarList({
  items,
}: {
  items: { key: string; label: string; market: string; value: number; tip: string }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">沒有持股資料</p>;
  }
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li
          key={item.key}
          title={item.tip}
          className="grid grid-cols-[7rem_1fr] items-center gap-2 text-xs"
        >
          <span className="truncate text-gray-600 dark:text-gray-400">{item.label}</span>
          <span className="sensitive flex min-w-0 items-center gap-2">
            <span
              className={`h-4 shrink-0 rounded ${MARKET_BAR[item.market] ?? "bg-gray-400"}`}
              style={{ width: `max(2px, ${(item.value / max) * 70}%)` }}
            />
            <span className="whitespace-nowrap tabular-nums text-gray-950 dark:text-gray-50">
              {ntd(item.value)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const VIEWS = [
  { label: "持股", value: "symbol" },
  { label: "券商", value: "broker" },
] as const;

/** 配置卡：台美股比例條＋各持股／各券商市值長條圖（切換） */
export function AllocationCard({ summary }: { summary: AssetSummary }) {
  const [view, setView] = useState<"symbol" | "broker">("symbol");

  const items =
    view === "symbol"
      ? summary.bySymbol.map((s) => ({
          key: s.symbol,
          label: s.name || s.symbol,
          market: s.market,
          value: s.valueTwd,
          tip: `${s.name ? `${s.name}（${s.symbol}）` : s.symbol}：${ntd(s.valueTwd)}，占持股 ${pct(s.share)}`,
        }))
      : summary.byBroker.map((b) => ({
          key: `${b.broker}|${b.market}`,
          label: `${b.broker} ${MARKET_LABEL[b.market] ?? b.market}`,
          market: b.market,
          value: b.valueTwd,
          tip: `${b.broker} ${MARKET_LABEL[b.market] ?? b.market}：${ntd(b.valueTwd)}${
            b.valueUsd !== null ? `（${usd(b.valueUsd)}）` : ""
          }`,
        }));

  return (
    <section className={`mt-3 ${CARD}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">配置</h2>
        <div className="flex gap-1.5">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={view === v.value ? ACTIVE_PILL : IDLE_PILL}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="sensitive mt-3 flex h-2 gap-0.5"
        role="img"
        aria-label="台股與美股占持股總市值的比例"
      >
        {summary.marketSplit
          .filter((m) => m.share > 0)
          .map((m) => (
            <div
              key={m.market}
              className={`rounded-full ${MARKET_BAR[m.market]}`}
              style={{ width: `${m.share * 100}%` }}
            />
          ))}
      </div>
      <div className="sensitive mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {summary.marketSplit.map((m) => (
          <span key={m.market} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${MARKET_BAR[m.market]}`} />
            {MARKET_LABEL[m.market]} {pct(m.share)} · {ntd(m.valueTwd)}
            {m.market === "US" && summary.usTotalUsd > 0 && `（${usd(summary.usTotalUsd)}）`}
          </span>
        ))}
      </div>

      <BarList items={items} />
    </section>
  );
}
