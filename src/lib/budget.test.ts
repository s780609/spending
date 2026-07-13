import { describe, expect, it } from "vitest";
import { computeBudgetStatus } from "./budget";

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
