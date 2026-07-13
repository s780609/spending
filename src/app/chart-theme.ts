"use client";

import { useDarkMode } from "@/lib/use-dark-mode";

export type ChartTheme = {
  isDark: boolean;
  grid: string;
  axis: string;
  netWorth: string;
  leverage: string;
  /** Area fill under net-worth line (top → bottom opacity) */
  netWorthFillTop: number;
  netWorthFillBottom: number;
  cursor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  legend: string;
  /** Active dot outer ring (usually matches card/bg) */
  activeDotStroke: string;
};

const LIGHT_THEME: ChartTheme = {
  isDark: false,
  grid: "#e5e7eb",
  axis: "#9ca3af",
  netWorth: "#18181b",
  leverage: "#0ea5e9",
  netWorthFillTop: 0.14,
  netWorthFillBottom: 0,
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
 * pure-white strokes that wash out on dark cards.
 */
const DARK_THEME: ChartTheme = {
  isDark: true,
  grid: "rgba(161, 161, 170, 0.22)",
  axis: "#a1a1aa",
  netWorth: "#34d399",
  leverage: "#fbbf24",
  netWorthFillTop: 0.28,
  netWorthFillBottom: 0,
  cursor: "rgba(161, 161, 170, 0.45)",
  tooltipBg: "rgba(24, 24, 27, 0.94)",
  tooltipBorder: "rgba(255, 255, 255, 0.12)",
  tooltipText: "#fafafa",
  tooltipMuted: "#a1a1aa",
  legend: "#d4d4d8",
  activeDotStroke: "#18181b",
};

export function useChartTheme(): ChartTheme {
  const isDark = useDarkMode();
  return isDark ? DARK_THEME : LIGHT_THEME;
}
