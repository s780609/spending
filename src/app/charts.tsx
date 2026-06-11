"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES } from "@/lib/categories";
import { shiftMonth } from "@/lib/dates";

/** 與 CATEGORIES 順序對應，固定每個分類的顏色 */
const PALETTE = [
  "#f97316", // 飲食
  "#0ea5e9", // 交通
  "#22c55e", // 日用
  "#a855f7", // 訂閱
  "#ec4899", // 娛樂
  "#ef4444", // 醫療
  "#14b8a6", // 保險
  "#eab308", // 房租
  "#8b5cf6", // 貸款
  "#64748b", // 其他
  "#9ca3af", // 未分類
];

function colorOf(category: string, categories: readonly string[]): string {
  const index = categories.indexOf(category);
  return PALETTE[index >= 0 ? index % PALETTE.length : PALETTE.length - 1];
}

function formatNtd(value: unknown): string {
  return `NT$ ${Number(value).toLocaleString("zh-TW")}`;
}

const ACTIVE_PILL =
  "rounded-full bg-gray-950 px-2.5 py-0.5 text-xs font-medium text-white";
const IDLE_PILL =
  "rounded-full px-2.5 py-0.5 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/10 hover:bg-gray-950/5";

function RangeButtons({
  options,
  value,
  onChange,
}: {
  options: { label: string; months: number }[];
  value: number;
  onChange: (months: number) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.months)}
          className={value === option.months ? ACTIVE_PILL : IDLE_PILL}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const PIE_RANGES = [
  { label: "本月", months: 1 },
  { label: "近 3 個月", months: 3 },
  { label: "近 6 個月", months: 6 },
  { label: "近 12 個月", months: 12 },
  { label: "全部", months: Number.POSITIVE_INFINITY },
];

export function CategoryPie({
  data,
  month,
  categories = CATEGORIES,
}: {
  /** 每月 × 分類加總（只含檢視月份以前） */
  data: { month: string; category: string; total: number }[];
  /** 目前檢視的月份 YYYY-MM，區間以此為終點 */
  month: string;
  /** 分類清單（決定顏色對應），預設個人記帳分類 */
  categories?: readonly string[];
}) {
  const [months, setMonths] = useState(1);

  const start = Number.isFinite(months) ? shiftMonth(month, -(months - 1)) : "";
  const sums = new Map<string, number>();
  for (const entry of data) {
    if (entry.month <= month && entry.month >= start) {
      sums.set(
        entry.category,
        (sums.get(entry.category) ?? 0) + entry.total,
      );
    }
  }
  const pieData = [...sums.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <RangeButtons options={PIE_RANGES} value={months} onChange={setMonths} />
      {pieData.length === 0 ? (
        <p className="flex h-[260px] items-center justify-center text-sm text-gray-400">
          這個區間沒有資料
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={colorOf(entry.name, categories)} />
              ))}
            </Pie>
            <Tooltip formatter={formatNtd} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface MonthCategoryEntry {
  month: string;
  category: string;
  total: number;
}

const FAMILY_SOURCES = [
  { label: "合併", value: "all" },
  { label: "帳戶", value: "bank" },
  { label: "信用卡", value: "card" },
] as const;

/** 家庭分類佔比：可切換帳戶/信用卡/合併；合併時剔除帳戶側卡費避免與卡單明細重複 */
export function FamilySpendingPie({
  bank,
  card,
  month,
  categories,
}: {
  bank: MonthCategoryEntry[];
  card: MonthCategoryEntry[];
  month: string;
  categories: readonly string[];
}) {
  const [source, setSource] =
    useState<(typeof FAMILY_SOURCES)[number]["value"]>("all");

  const data =
    source === "bank"
      ? bank
      : source === "card"
        ? card
        : [...bank.filter((entry) => entry.category !== "卡費"), ...card];

  return (
    <div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {FAMILY_SOURCES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSource(option.value)}
            className={source === option.value ? ACTIVE_PILL : IDLE_PILL}
          >
            {option.label}
          </button>
        ))}
      </div>
      <CategoryPie data={data} month={month} categories={categories} />
    </div>
  );
}

const TREND_RANGES = [
  { label: "近 3 個月", months: 3 },
  { label: "近 6 個月", months: 6 },
  { label: "近 12 個月", months: 12 },
  { label: "全部", months: Number.POSITIVE_INFINITY },
];

export function MonthlyTrend({
  data,
}: {
  data: { month: string; total: number }[];
}) {
  const [mode, setMode] = useState<"month" | "year">("month");
  const [months, setMonths] = useState(12);

  let shown: { label: string; total: number }[];
  if (mode === "year") {
    const byYear = new Map<string, number>();
    for (const entry of data) {
      const year = entry.month.slice(0, 4);
      byYear.set(year, (byYear.get(year) ?? 0) + entry.total);
    }
    shown = [...byYear.entries()].map(([label, total]) => ({ label, total }));
  } else {
    const sliced = Number.isFinite(months) ? data.slice(-months) : data;
    shown = sliced.map((entry) => ({ label: entry.month, total: entry.total }));
  }

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMode("month")}
          className={mode === "month" ? ACTIVE_PILL : IDLE_PILL}
        >
          月
        </button>
        <button
          type="button"
          onClick={() => setMode("year")}
          className={mode === "year" ? ACTIVE_PILL : IDLE_PILL}
        >
          年
        </button>
        {mode === "month" && (
          <>
            <span className="mx-1 h-4 w-px bg-gray-950/10" aria-hidden />
            {TREND_RANGES.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={() => setMonths(range.months)}
                className={months === range.months ? ACTIVE_PILL : IDLE_PILL}
              >
                {range.label}
              </button>
            ))}
          </>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={shown}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={6} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={56}
            tickFormatter={(value: number) => value.toLocaleString("zh-TW")}
          />
          <Tooltip formatter={formatNtd} />
          <Line
            type="monotone"
            dataKey="total"
            name="支出"
            stroke="#0a0a0a"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
