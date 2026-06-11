"use client";

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

function colorOf(category: string): string {
  const index = (CATEGORIES as readonly string[]).indexOf(category);
  return PALETTE[index >= 0 ? index % PALETTE.length : PALETTE.length - 1];
}

function formatNtd(value: unknown): string {
  return `NT$ ${Number(value).toLocaleString("zh-TW")}`;
}

export function CategoryPie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={colorOf(entry.name)} />
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
  );
}

export function MonthlyTrend({
  data,
}: {
  data: { month: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickMargin={6} />
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
  );
}
