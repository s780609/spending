"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

function formatNtd(value: unknown): string {
  return `NT$ ${Math.round(Number(value)).toLocaleString("zh-TW")}`;
}

function NetWorthTooltip({
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

  const rows = payload.filter((entry) => entry.name !== "netWorth");
  if (!rows.length) return null;

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
      <ul className="mt-1.5 space-y-1">
        {rows.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: entry.color,
                boxShadow: theme.isDark
                  ? `0 0 8px ${entry.color}`
                  : undefined,
              }}
            />
            <span style={{ color: theme.tooltipMuted }}>{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums tracking-tight">
              {entry.name === "槓桿比率"
                ? Number(entry.value).toFixed(2)
                : formatNtd(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NetWorthChart({
  data,
}: {
  data: { date: string; netWorth: number; leverage: number | null }[];
}) {
  const theme = useChartTheme();
  const uid = useId().replace(/:/g, "");
  const fillId = `nw-fill-${uid}`;
  const glowId = `nw-glow-${uid}`;

  if (data.length === 0) {
    return (
      <p className="flex h-[260px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        還沒有快照，每天會自動記錄一筆
      </p>
    );
  }

  const axisTick = { fontSize: 11, fill: theme.axis };
  // 點數多時縮小圓點，避免擠成一條粗線
  const dotR = data.length > 40 ? 2 : data.length > 20 ? 2.5 : 3;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          dataKey="date"
          tick={axisTick}
          tickMargin={6}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: string) => value.slice(5)}
        />
        <YAxis
          yAxisId="networth"
          tick={axisTick}
          width={64}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) =>
            Math.round(value).toLocaleString("zh-TW")
          }
        />
        <YAxis
          yAxisId="leverage"
          orientation="right"
          tick={axisTick}
          width={40}
          domain={["auto", "auto"]}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<NetWorthTooltip theme={theme} />}
          cursor={{
            stroke: theme.cursor,
            strokeWidth: 1,
            strokeDasharray: "4 4",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: theme.legend, paddingTop: 4 }}
        />
        <Area
          yAxisId="networth"
          type="monotone"
          dataKey="netWorth"
          tooltipType="none"
          fill={`url(#${fillId})`}
          stroke="none"
          isAnimationActive={false}
          legendType="none"
        />
        <Line
          yAxisId="networth"
          type="monotone"
          dataKey="netWorth"
          name="淨資產"
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
        <Line
          yAxisId="leverage"
          type="monotone"
          dataKey="leverage"
          name="槓桿比率"
          stroke={theme.secondary}
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
          dot={(props) => (
            <ChartDot
              cx={props.cx}
              cy={props.cy}
              fill={theme.secondary}
              ring={theme.activeDotStroke}
              r={dotR}
            />
          )}
          activeDot={(props) => (
            <ChartActiveDot
              cx={props.cx}
              cy={props.cy}
              fill={theme.secondary}
              ring={theme.activeDotStroke}
            />
          )}
          opacity={theme.isDark ? 0.95 : 1}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
