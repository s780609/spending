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
  it("當月實際尚未超支，但歷史平均高於預算時，預估超支", () => {
    const [p] = computeBudgetProjection(
      [{ category: "手遊", amount: 1000 }],
      new Map([["手遊", 0]]), // 當月發票還沒進來
      new Map([["手遊", 1500]]), // 過去平均每月 1500
    );
    expect(p.over).toBe(false); // 當月實際未超支
    expect(p.average).toBe(1500);
    expect(p.projected).toBe(1500);
    expect(p.projectedOver).toBe(true);
    expect(p.projectedRatio).toBe(1.5);
  });

  it("當月實際已高於歷史平均時，預估取實際值", () => {
    const [p] = computeBudgetProjection(
      [{ category: "餐飲", amount: 5000 }],
      new Map([["餐飲", 4000]]),
      new Map([["餐飲", 3000]]),
    );
    expect(p.projected).toBe(4000);
    expect(p.projectedOver).toBe(false);
  });

  it("歷史平均與當月實際皆低於預算時，預估不超支", () => {
    const [p] = computeBudgetProjection(
      [{ category: "娛樂", amount: 2000 }],
      new Map([["娛樂", 200]]),
      new Map([["娛樂", 800]]),
    );
    expect(p.projected).toBe(800);
    expect(p.projectedOver).toBe(false);
    expect(p.projectedRatio).toBe(0.4);
  });

  it("沒有歷史資料的分類，average 為 0，預估等於當月實際", () => {
    const [p] = computeBudgetProjection(
      [{ category: "新分類", amount: 1000 }],
      new Map([["新分類", 300]]),
      new Map(),
    );
    expect(p.average).toBe(0);
    expect(p.projected).toBe(300);
    expect(p.projectedOver).toBe(false);
  });

  it("預算為 0 時 projectedRatio 為 0，避免除以零", () => {
    const [p] = computeBudgetProjection(
      [{ category: "手遊", amount: 0 }],
      new Map(),
      new Map([["手遊", 500]]),
    );
    expect(p.projectedRatio).toBe(0);
    expect(p.projectedOver).toBe(true);
  });
});
