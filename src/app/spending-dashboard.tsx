"use client";

import type { ReactNode } from "react";
import { ACTIVE_PILL, colorOf, IDLE_PILL } from "@/app/charts";
import { shiftMonth } from "@/lib/dates";

export const CARD =
  "rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10";

export function ntd(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 本月 vs 上月、當年累計與月均（只算有資料的月份） */
export function monthStats(
  totals: { month: string; total: number }[],
  month: string,
) {
  const byMonth = new Map(totals.map((t) => [t.month, t.total]));
  const current = byMonth.get(month) ?? 0;
  const prev = byMonth.get(shiftMonth(month, -1));
  const year = month.slice(0, 4);
  const yearEntries = totals.filter((t) => t.month.startsWith(`${year}-`));
  const yearTotal = yearEntries.reduce((s, t) => s + t.total, 0);
  return {
    current,
    change: prev && prev > 0 ? (current - prev) / prev : null,
    year,
    yearTotal,
    monthlyAvg: yearEntries.length > 0 ? yearTotal / yearEntries.length : 0,
  };
}

/** 較上月變化：支出增加為紅、減少為綠 */
export function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return <span>較上月 —</span>;
  }
  const up = change > 0;
  return (
    <span>
      較上月{" "}
      <span className={up ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
        {up ? "▲" : "▼"} {pct(Math.abs(change))}
      </span>
    </span>
  );
}

/**
 * 主卡：大數字＋說明行，下方可放比例條。
 * segments：多段比例條（如帳戶／信用卡）；meter：單一使用率條（如預算）
 */
export function SpendingHero({
  label,
  value,
  lines,
  segments,
  meter,
}: {
  label: string;
  value: number;
  /** 每行由多個項目組成，項目間以「·」分隔，換行只發生在項目之間 */
  lines: ReactNode[][];
  segments?: { key: string; label: string; value: number; color: string }[];
  meter?: { ratio: number; label: string };
}) {
  const segTotal = segments?.reduce((s, x) => s + Math.max(x.value, 0), 0) ?? 0;
  const meterPct = meter ? Math.min(100, Math.max(0, meter.ratio * 100)) : 0;
  const meterColor = meter && meter.ratio > 1 ? "bg-red-500" : meter && meter.ratio > 0.8 ? "bg-amber-500" : "bg-sky-500";

  return (
    <section className={`mt-4 ${CARD}`}>
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="sensitive mt-1 text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
        {ntd(value)}
      </p>
      {lines.map((items, i) => (
        <p
          key={i}
          className="sensitive mt-1 flex flex-wrap gap-x-1.5 text-xs text-gray-600 dark:text-gray-400"
        >
          {items.map((item, j) => (
            <span key={j} className="whitespace-nowrap">
              {j > 0 && <span className="mr-1.5 text-gray-300 dark:text-gray-600">·</span>}
              {item}
            </span>
          ))}
        </p>
      ))}

      {segments && segTotal > 0 && (
        <>
          <div className="sensitive mt-4 flex h-2 gap-0.5">
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div
                  key={s.key}
                  className="rounded-full"
                  style={{ width: `${(s.value / segTotal) * 100}%`, backgroundColor: s.color }}
                />
              ))}
          </div>
          <div className="sensitive mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
            {segments.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} {pct(Math.max(s.value, 0) / segTotal)} · {ntd(s.value)}
              </span>
            ))}
          </div>
        </>
      )}

      {meter && (
        <>
          <div className="sensitive mt-4 flex h-2 gap-0.5">
            {meterPct > 0 && (
              <div className={`rounded-full ${meterColor}`} style={{ width: `${meterPct}%` }} />
            )}
            {meterPct < 100 && <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />}
          </div>
          <p className="sensitive mt-1.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className={`h-2 w-2 rounded-full ${meterColor}`} />
            {meter.label}
          </p>
        </>
      )}
    </section>
  );
}

/** 一排切換鈕 */
export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={value === o.value ? ACTIVE_PILL : IDLE_PILL}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 分類比例條＋水平長條清單；點列查明細 */
export function CategoryBars({
  rows,
  categories,
  onSelect,
}: {
  rows: { name: string; value: number }[];
  categories: readonly string[];
  onSelect: (category: string) => void;
}) {
  const positive = rows.filter((r) => r.value > 0);
  const total = positive.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...positive.map((r) => r.value));
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">這個區間沒有資料</p>;
  }
  return (
    <>
      <div className="sensitive mt-3 flex h-2 gap-0.5" role="img" aria-label="各分類占支出比例">
        {positive.map((r) => (
          <div
            key={r.name}
            className="rounded-full"
            style={{ width: `${(r.value / total) * 100}%`, backgroundColor: colorOf(r.name, categories) }}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-0.5">
        {rows.map((r) => (
          <li key={r.name}>
            <button
              type="button"
              onClick={() => onSelect(r.name)}
              className="grid w-full grid-cols-[4.5rem_1fr_3rem] items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-gray-950/5 dark:hover:bg-white/5 sm:grid-cols-[6rem_1fr_3.5rem]"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorOf(r.name, categories) }}
                />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="sensitive flex min-w-0 items-center gap-2">
                <span
                  className="h-4 shrink-0 rounded"
                  style={{
                    width: `max(2px, ${(Math.max(r.value, 0) / max) * 65}%)`,
                    backgroundColor: colorOf(r.name, categories),
                  }}
                />
                <span
                  className={`whitespace-nowrap tabular-nums ${
                    r.value < 0 ? "text-green-600" : "text-gray-950 dark:text-gray-50"
                  }`}
                >
                  {ntd(r.value)}
                </span>
              </span>
              <span className="sensitive text-right tabular-nums text-gray-400 dark:text-gray-500">
                {total > 0 ? pct(Math.max(r.value, 0) / total) : "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
