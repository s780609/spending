"use client";

import { useId, useState } from "react";
import {
  Area,
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
import {
  ChartActiveDot,
  ChartDot,
  type ChartTheme,
  useChartTheme,
} from "@/app/chart-theme";

/** 與 CATEGORIES 順序對應，固定每個分類的顏色 */
const PALETTE = [
  "#f97316", // 飲食
  "#0ea5e9", // 交通
  "#22c55e", // 日用
  "#a855f7", // 訂閱
  "#ec4899", // 娛樂
  "#84cc16", // 手遊
  "#ef4444", // 醫療
  "#14b8a6", // 保險
  "#eab308", // 房租
  "#8b5cf6", // 貸款
  "#64748b", // 其他
  "#9ca3af", // 未分類
];

export function colorOf(category: string, categories: readonly string[]): string {
  const index = categories.indexOf(category);
  return PALETTE[index >= 0 ? index % PALETTE.length : PALETTE.length - 1];
}

function formatNtd(value: unknown): string {
  return `NT$ ${Math.round(Number(value)).toLocaleString("zh-TW")}`;
}

export const ACTIVE_PILL =
  "rounded-full bg-gray-950 dark:bg-white px-2.5 py-0.5 text-xs font-medium text-white dark:text-gray-950";
export const IDLE_PILL =
  "rounded-full px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 hover:bg-gray-950/5 dark:hover:bg-white/5";

/** 年份切換按鈕（由新到舊） */
export function YearPicker({
  years,
  value,
  onChange,
}: {
  years: string[];
  value: string;
  onChange: (year: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {years.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onChange(year)}
          className={value === year ? ACTIVE_PILL : IDLE_PILL}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

/** 取出某年 1 月到該年最後有資料月份的每月加總，中間缺的月份補 0 */
export function yearMonthlyTotals(
  trend: { month: string; total: number }[],
  year: string,
): { month: string; total: number }[] {
  const byMonth = new Map(
    trend
      .filter((entry) => entry.month.startsWith(`${year}-`))
      .map((entry) => [entry.month, entry.total]),
  );
  const lastMonth = Math.max(0, ...[...byMonth.keys()].map((m) => Number(m.slice(5))));
  return Array.from({ length: lastMonth }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month: key, total: byMonth.get(key) ?? 0 };
  });
}

/** 分類甜甜圈圖（只畫正值）；空資料顯示提示文字 */
export function CategoryDonut({
  data,
  categories,
  onSliceClick,
  showLegend = true,
}: {
  data: { name: string; value: number }[];
  categories: readonly string[];
  onSliceClick?: (category: string) => void;
  showLegend?: boolean;
}) {
  const shown = data.filter((entry) => entry.value > 0);
  if (shown.length === 0) {
    return (
      <p className="flex h-[260px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        這個區間沒有資料
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={shown}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
          cursor={onSliceClick ? "pointer" : undefined}
          onClick={(entry: { name?: string }) => {
            if (onSliceClick && entry?.name) {
              onSliceClick(entry.name);
            }
          }}
        >
          {shown.map((entry) => (
            <Cell key={entry.name} fill={colorOf(entry.name, categories)} />
          ))}
        </Pie>
        <Tooltip formatter={formatNtd} />
        {showLegend && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

/** 依月份條件加總「月 × 分類」，去掉四捨五入為 0 的分類，由大到小排序 */
export function categoryRows(
  entries: readonly { month: string; category: string; total: number }[],
  matchMonth: (month: string) => boolean,
): { name: string; value: number }[] {
  const sums = new Map<string, number>();
  for (const entry of entries) {
    if (matchMonth(entry.month)) {
      sums.set(entry.category, (sums.get(entry.category) ?? 0) + entry.total);
    }
  }
  return [...sums.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((row) => Math.round(row.value) !== 0)
    .sort((a, b) => b.value - a.value);
}

/** 分類甜甜圈圖＋分類明細清單（金額、占比），點切片或清單列都會回呼該分類 */
export function CategoryBreakdown({
  rows,
  categories,
  onSelect,
}: {
  rows: { name: string; value: number }[];
  categories: readonly string[];
  onSelect: (category: string) => void;
}) {
  const positiveTotal = rows.reduce((s, r) => s + Math.max(r.value, 0), 0);
  return (
    <div className="mt-2 grid items-center gap-3 sm:grid-cols-2">
      <CategoryDonut
        data={rows}
        categories={categories}
        onSliceClick={onSelect}
        showLegend={false}
      />
      {rows.length > 0 && (
        <ul className="space-y-0.5">
          {rows.map((row) => {
            const share =
              positiveTotal > 0 ? Math.max(row.value, 0) / positiveTotal : 0;
            return (
              <li key={row.name}>
                <button
                  type="button"
                  onClick={() => onSelect(row.name)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-950/5 dark:hover:bg-white/5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorOf(row.name, categories) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-950 dark:text-gray-50">
                    {row.name}
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-400 dark:text-gray-500">
                    {(share * 100).toFixed(1)}%
                  </span>
                  <span
                    className={`w-24 shrink-0 text-right tabular-nums font-medium ${
                      row.value < 0
                        ? "text-green-600"
                        : "text-gray-950 dark:text-gray-50"
                    }`}
                  >
                    {Math.round(row.value).toLocaleString("zh-TW")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const TREND_RANGES = [
  { label: "近 3 個月", months: 3 },
  { label: "近 6 個月", months: 6 },
  { label: "近 12 個月", months: 12 },
  { label: "全部", months: Number.POSITIVE_INFINITY },
];

function TrendTooltip({
  active,
  payload,
  label,
  theme,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  theme: ChartTheme;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div
      className="rounded-xl px-3 py-2 shadow-lg backdrop-blur-sm"
      style={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.tooltipText,
        boxShadow: theme.isDark
          ? "0 12px 32px rgba(0, 0, 0, 0.45)"
          : "0 10px 24px rgba(15, 23, 42, 0.12)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: theme.tooltipMuted }}>
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            backgroundColor: entry.color ?? theme.primary,
            boxShadow: theme.isDark
              ? `0 0 8px ${entry.color ?? theme.primary}`
              : undefined,
          }}
        />
        <span style={{ color: theme.tooltipMuted }}>
          {entry.name ?? "支出"}
        </span>
        <span className="ml-auto font-medium tabular-nums tracking-tight">
          {formatNtd(entry.value)}
        </span>
      </p>
    </div>
  );
}

export function MonthlyTrend({
  data,
  yearView = false,
  onPointClick,
}: {
  data: { month: string; total: number }[];
  /** 單一年度檢視：隱藏月/年與區間切換、全部顯示，X 軸只標月份 */
  yearView?: boolean;
  /** 點資料點時回呼，label 為 YYYY-MM（月模式）或 YYYY（年模式） */
  onPointClick?: (label: string) => void;
}) {
  const theme = useChartTheme();
  const uid = useId().replace(/:/g, "");
  const fillId = `trend-fill-${uid}`;
  const glowId = `trend-glow-${uid}`;
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
    const sliced =
      !yearView && Number.isFinite(months) ? data.slice(-months) : data;
    shown = sliced.map((entry) => ({ label: entry.month, total: entry.total }));
  }

  const axisTick = { fontSize: 12, fill: theme.axis };
  const dotR = shown.length > 18 ? 2.5 : 3.5;

  return (
    <div>
      {!yearView && (
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
            <span
              className="mx-1 h-4 w-px bg-gray-950/10 dark:bg-white/10"
              aria-hidden
            />
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
      )}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={shown}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          style={onPointClick ? { cursor: "pointer" } : undefined}
          onClick={(state) => {
            const label = state?.activeLabel;
            if (onPointClick && typeof label === "string") {
              onPointClick(label);
            }
          }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={theme.primary}
                stopOpacity={theme.primaryFillTop}
              />
              <stop
                offset="55%"
                stopColor={theme.primary}
                stopOpacity={theme.primaryFillTop * 0.35}
              />
              <stop
                offset="100%"
                stopColor={theme.primary}
                stopOpacity={theme.primaryFillBottom}
              />
            </linearGradient>
            {theme.isDark && (
              <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickMargin={6}
            axisLine={false}
            tickLine={false}
            tickFormatter={
              yearView
                ? (label: string) => `${Number(label.slice(5))}月`
                : undefined
            }
          />
          <YAxis
            tick={axisTick}
            width={56}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) =>
              Math.round(value).toLocaleString("zh-TW")
            }
          />
          <Tooltip
            content={<TrendTooltip theme={theme} />}
            cursor={{
              stroke: theme.cursor,
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            fill={`url(#${fillId})`}
            stroke="none"
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="total"
            name="支出"
            stroke={theme.primary}
            strokeWidth={theme.isDark ? 2.5 : 2}
            dot={(props) => (
              <ChartDot
                cx={props.cx}
                cy={props.cy}
                fill={theme.primary}
                ring={theme.activeDotStroke}
                r={dotR}
              />
            )}
            activeDot={(props) => (
              <ChartActiveDot
                cx={props.cx}
                cy={props.cy}
                fill={theme.primary}
                ring={theme.activeDotStroke}
              />
            )}
            style={theme.isDark ? { filter: `url(#${glowId})` } : undefined}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
