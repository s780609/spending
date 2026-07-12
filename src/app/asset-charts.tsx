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

const ACTIVE_PILL =
  "rounded-full bg-gray-950 dark:bg-white px-2.5 py-0.5 text-xs font-medium text-white dark:text-gray-950";
const IDLE_PILL =
  "rounded-full px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 hover:bg-gray-950/5 dark:hover:bg-white/5";

const PIE_COLORS = [
  "#0ea5e9", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#ef4444",
  "#14b8a6", "#eab308", "#8b5cf6", "#64748b", "#84cc16", "#06b6d4",
];

function formatNtd(value: unknown): string {
  return `NT$ ${Math.round(Number(value)).toLocaleString("zh-TW")}`;
}

const MARKET_TABS = [
  { label: "全部", value: "ALL" },
  { label: "台股", value: "TW" },
  { label: "美股", value: "US" },
];

export function AssetPie({
  data,
}: {
  data: { symbol: string; name: string | null; market: string; valueTwd: number }[];
}) {
  const [market, setMarket] = useState("ALL");

  const sums = new Map<string, number>();
  for (const entry of data) {
    if (market !== "ALL" && entry.market !== market) continue;
    const label = entry.name || entry.symbol;
    sums.set(label, (sums.get(label) ?? 0) + entry.valueTwd);
  }
  const pieData = [...sums.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {MARKET_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setMarket(tab.value)}
            className={market === tab.value ? ACTIVE_PILL : IDLE_PILL}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {pieData.length === 0 ? (
        <p className="flex h-[260px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          沒有持股資料
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
              {pieData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={formatNtd} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function NetWorthChart({
  data,
}: {
  data: { date: string; netWorth: number; leverage: number | null }[];
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-[260px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        還沒有快照，每天會自動記錄一筆
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={6} />
        <YAxis
          yAxisId="networth"
          tick={{ fontSize: 11 }}
          width={64}
          tickFormatter={(value: number) => Math.round(value).toLocaleString("zh-TW")}
        />
        <YAxis
          yAxisId="leverage"
          orientation="right"
          tick={{ fontSize: 11 }}
          width={40}
          domain={["auto", "auto"]}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) =>
            name === "槓桿比率"
              ? Number(value).toFixed(2)
              : formatNtd(value)
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="networth"
          type="monotone"
          dataKey="netWorth"
          name="淨資產"
          stroke="#0a0a0a"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          yAxisId="leverage"
          type="monotone"
          dataKey="leverage"
          name="槓桿比率"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
