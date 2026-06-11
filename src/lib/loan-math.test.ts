import { describe, expect, it } from "vitest";
import { creditLoanStatus, pledgeStatus } from "./loan-math";

describe("pledgeStatus 質押逐日計息", () => {
  it("利息 = 本金 × 年利率 × 經過天數 / 365", () => {
    const status = pledgeStatus(1_000_000, 2.5, "2026-01-01", "2026-01-31");
    expect(status.days).toBe(30);
    expect(status.interest).toBeCloseTo((1_000_000 * 0.025 * 30) / 365, 2);
    expect(status.total).toBeCloseTo(1_000_000 + status.interest, 2);
  });

  it("借貸當天利息為 0", () => {
    const status = pledgeStatus(500_000, 3, "2026-06-11", "2026-06-11");
    expect(status.days).toBe(0);
    expect(status.interest).toBe(0);
    expect(status.total).toBe(500_000);
  });
});

describe("creditLoanStatus 信貸本息平均攤還", () => {
  it("零利率時月付金 = 本金/期數，剩餘本金線性遞減", () => {
    const status = creditLoanStatus(840_000, 0, "2025-10-20", 84, "2026-06-11");
    expect(status.monthlyPayment).toBeCloseTo(10_000, 6);
    expect(status.paymentsMade).toBe(7);
    expect(status.remainingPrincipal).toBeCloseTo(840_000 - 70_000, 6);
    expect(status.interestPaid).toBeCloseTo(0, 6);
  });

  it("已繳期數依日期計算：未到還款日不計當月", () => {
    // 2025-10-20 借，每月 20 號還款
    expect(
      creditLoanStatus(1_000_000, 3, "2025-10-20", 84, "2026-06-11")
        .paymentsMade,
    ).toBe(7); // 11/20 ~ 5/20 共 7 期
    expect(
      creditLoanStatus(1_000_000, 3, "2025-10-20", 84, "2026-06-20")
        .paymentsMade,
    ).toBe(8); // 6/20 當天算第 8 期
    expect(
      creditLoanStatus(1_000_000, 3, "2025-10-20", 84, "2025-11-01")
        .paymentsMade,
    ).toBe(0);
  });

  it("繳清全部期數後剩餘本金為 0，且期數不超過總期數", () => {
    const status = creditLoanStatus(600_000, 2.8, "2018-01-15", 60, "2026-06-11");
    expect(status.paymentsMade).toBe(60);
    expect(status.remainingPrincipal).toBeCloseTo(0, 4);
  });

  it("有利率時：剩餘本金小於原本金、累計利息為正、月付金固定", () => {
    const status = creditLoanStatus(1_000_000, 3, "2025-10-20", 84, "2026-06-11");
    expect(status.monthlyPayment).toBeGreaterThan(1_000_000 / 84);
    expect(status.remainingPrincipal).toBeLessThan(1_000_000);
    expect(status.remainingPrincipal).toBeGreaterThan(0);
    expect(status.interestPaid).toBeGreaterThan(0);
    // 帳要平：已繳總額 = 已還本金 + 已付利息
    expect(status.paymentsMade * status.monthlyPayment).toBeCloseTo(
      1_000_000 - status.remainingPrincipal + status.interestPaid,
      4,
    );
  });
});
