"use client";

import { useDarkMode } from "@/lib/use-dark-mode";

export type ChartTheme = {
  isDark: boolean;
  grid: string;
  axis: string;
  /** 主軸線（淨資產、支出趨勢） */
  primary: string;
  /** 副軸線（槓桿等） */
  secondary: string;
  primaryFillTop: number;
  primaryFillBottom: number;
  cursor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  legend: string;
  /** 點外圈描邊，對齊卡片底色 */
  activeDotStroke: string;
};

const LIGHT_THEME: ChartTheme = {
  isDark: false,
  grid: "#e5e7eb",
  axis: "#9ca3af",
  primary: "#18181b",
  secondary: "#0ea5e9",
  primaryFillTop: 0.14,
  primaryFillBottom: 0,
  cursor: "#d1d5db",
  tooltipBg: "#ffffff",
  tooltipBorder: "rgba(9, 9, 11, 0.08)",
  tooltipText: "#18181b",
  tooltipMuted: "#6b7280",
  legend: "#6b7280",
  activeDotStroke: "#ffffff",
};

/**
 * Dark palette: emerald / amber keep series distinct without harsh
 * pure-white strokes that wash out on dark cards (bg-gray-900).
 */
const DARK_THEME: ChartTheme = {
  isDark: true,
  grid: "rgba(161, 161, 170, 0.22)",
  axis: "#a1a1aa",
  primary: "#34d399",
  secondary: "#fbbf24",
  primaryFillTop: 0.28,
  primaryFillBottom: 0,
  cursor: "rgba(161, 161, 170, 0.45)",
  tooltipBg: "rgba(24, 24, 27, 0.94)",
  tooltipBorder: "rgba(255, 255, 255, 0.12)",
  tooltipText: "#fafafa",
  tooltipMuted: "#a1a1aa",
  legend: "#d4d4d8",
  activeDotStroke: "#111827",
};

export function useChartTheme(): ChartTheme {
  const isDark = useDarkMode();
  return isDark ? DARK_THEME : LIGHT_THEME;
}

/** 一般資料點：實心圓 + 卡片色描邊 */
export function ChartDot({
  cx,
  cy,
  fill,
  ring,
  r = 3,
}: {
  cx?: number;
  cy?: number;
  fill: string;
  ring: string;
  r?: number;
}) {
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={ring}
      strokeWidth={1.5}
    />
  );
}

/** Hover 放大點，外層帶淡光暈 */
export function ChartActiveDot({
  cx,
  cy,
  fill,
  ring,
}: {
  cx?: number;
  cy?: number;
  fill: string;
  ring: string;
}) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={fill} opacity={0.2} />
      <circle
        cx={cx}
        cy={cy}
        r={4.5}
        fill={fill}
        stroke={ring}
        strokeWidth={2}
      />
    </g>
  );
}
