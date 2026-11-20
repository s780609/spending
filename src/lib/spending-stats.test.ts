import { describe, expect, it } from "vitest";
import { lastMonths, monthlyTotals, monthStats } from "./spending-stats";

describe("monthStats 本月／上月／年累計", () => {
  const totals = [
    { month: "2025-12", total: 100 },
    { month: "2026-01", total: 200 },
    { month: "2026-02", total: 300 },
  ];

  it("計算較上月變化、年累計與月均", () => {
    expect(monthStats(totals, "2026-02")).toEqual({
      current: 300,
      change: 0.5,
      year: "2026",
      yearTotal: 500,
      monthlyAvg: 250,
    });
  });

  it("跨年比較上月、上月無資料時 change 為 null", () => {
    expect(monthStats(totals, "2026-01").change).toBe(1);
    expect(monthStats(totals, "2025-12").change).toBeNull();
  });

  it("本月沒資料時 current 為 0", () => {
    expect(monthStats(totals, "2026-03").current).toBe(0);
  });
});

describe("monthlyTotals / lastMonths", () => {
  it("把月 × 分類加總成每月合計並排序", () => {
    expect(
      monthlyTotals([
        { month: "2026-02", total: 1 },
        { month: "2026-01", total: 2 },
        { month: "2026-02", total: 3 },
      ]),
    ).toEqual([
      { month: "2026-01", total: 2 },
      { month: "2026-02", total: 4 },
    ]);
  });

  it("取最近 n 個月，缺的月份補 0", () => {
    expect(
      lastMonths(
        [
          { month: "2025-12", total: 5 },
          { month: "2026-02", total: 7 },
        ],
        "2026-02",
        4,
      ),
    ).toEqual([0, 5, 0, 7]);
  });
});
