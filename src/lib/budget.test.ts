import { describe, expect, it } from "vitest";
import { computeBudgetProjection, computeBudgetStatus } from "./budget";

describe("computeBudgetStatus", () => {
  it("花費未超過預算時 over 為 false", () => {
    const result = computeBudgetStatus(
      [{ category: "手遊", amount: 1000 }],
      new Map([["手遊", 800]]),
    );
    expect(result).toEqual([
      { category: "手遊", budget: 1000, spent: 800, over: false, ratio: 0.8 },
    ]);
  });

  it("花費超過預算時 over 為 true", () => {
    const [status] = computeBudgetStatus(
      [{ category: "手遊", amount: 1000 }],
      new Map([["手遊", 1500]]),
    );
    expect(status.over).toBe(true);
    expect(status.ratio).toBe(1.5);
  });

  it("剛好等於預算不算超支", () => {
    const [status] = computeBudgetStatus(
      [{ category: "手遊", amount: 1000 }],
      new Map([["手遊", 1000]]),
    );
    expect(status.over).toBe(false);
  });

  it("該分類當月沒有花費時 spent 為 0", () => {
    const [status] = computeBudgetStatus(
      [{ category: "娛樂", amount: 500 }],
      new Map(),
    );
    expect(status.spent).toBe(0);
    expect(status.over).toBe(false);
  });

  it("amount 為字串（來自 numeric 欄位）也能正確計算", () => {
    const [status] = computeBudgetStatus(
      [{ category: "手遊", amount: "1000.00" }],
      new Map([["手遊", 1200]]),
    );
    expect(status.budget).toBe(1000);
    expect(status.over).toBe(true);
  });

  it("預算為 0 時 ratio 為 0，避免除以零", () => {
    const [status] = computeBudgetStatus(
      [{ category: "手遊", amount: 0 }],
      new Map([["手遊", 100]]),
    );
    expect(status.ratio).toBe(0);
    expect(status.over).toBe(true);
  });
});

describe("computeBudgetProjection", () => {
  it("前 3 月平均高於月預算 → 預估超支；3 月總額 vs 月預算×3 也超支", () => {
    const [p] = computeBudgetProjection(
      [{ category: "手遊", amount: 1000 }],
      new Map([["手遊", 0]]), // 當月發票還沒進來
      new Map([["手遊", 4500]]), // 前 3 月總額 4500 → 平均 1500
    );
    expect(p.over).toBe(false); // 當月實際未超支
    expect(p.average).toBe(1500);
    expect(p.projected).toBe(1500);
    expect(p.projectedOver).toBe(true);
    expect(p.projectedRatio).toBe(1.5);
    // 前 3 月視角
    expect(p.lookback).toBe(3);
    expect(p.trailingSpent).toBe(4500);
    expect(p.trailingBudget).toBe(3000); // 1000 × 3
    expect(p.trailingOver).toBe(true);
    expect(p.trailingRatio).toBe(1.5);
  });

  it("當月實際已高於歷史平均時，預估取實際值", () => {
    const [p] = computeBudgetProjection(
      [{ category: "餐飲", amount: 5000 }],
      new Map([["餐飲", 4000]]),
      new Map([["餐飲", 9000]]), // 平均 3000
    );
    expect(p.projected).toBe(4000);
    expect(p.projectedOver).toBe(false);
    expect(p.trailingSpent).toBe(9000);
    expect(p.trailingBudget).toBe(15000);
    expect(p.trailingOver).toBe(false);
  });

  it("歷史平均與當月實際皆低於預算時，預估不超支", () => {
    const [p] = computeBudgetProjection(
      [{ category: "娛樂", amount: 2000 }],
      new Map([["娛樂", 200]]),
      new Map([["娛樂", 2400]]), // 平均 800
    );
    expect(p.projected).toBe(800);
    expect(p.projectedOver).toBe(false);
    expect(p.projectedRatio).toBe(0.4);
    expect(p.trailingSpent).toBe(2400);
    expect(p.trailingBudget).toBe(6000);
    expect(p.trailingRatio).toBe(0.4);
  });

  it("沒有歷史資料的分類，average／trailing 皆為 0，預估等於當月實際", () => {
    const [p] = computeBudgetProjection(
      [{ category: "新分類", amount: 1000 }],
      new Map([["新分類", 300]]),
      new Map(),
    );
    expect(p.average).toBe(0);
    expect(p.projected).toBe(300);
    expect(p.projectedOver).toBe(false);
    expect(p.trailingSpent).toBe(0);
    expect(p.trailingOver).toBe(false);
  });

  it("預算為 0 時 ratio 皆為 0，避免除以零", () => {
    const [p] = computeBudgetProjection(
      [{ category: "手遊", amount: 0 }],
      new Map(),
      new Map([["手遊", 1500]]),
    );
    expect(p.projectedRatio).toBe(0);
    expect(p.projectedOver).toBe(true);
    expect(p.trailingBudget).toBe(0);
    expect(p.trailingRatio).toBe(0);
    expect(p.trailingOver).toBe(true); // 1500 > 0
  });

  it("可指定 lookback 個月", () => {
    const [p] = computeBudgetProjection(
      [{ category: "手遊", amount: 1000 }],
      new Map(),
      new Map([["手遊", 2400]]),
      6,
    );
    expect(p.lookback).toBe(6);
    expect(p.average).toBe(400); // 2400 / 6
    expect(p.trailingBudget).toBe(6000); // 1000 × 6
  });
});
