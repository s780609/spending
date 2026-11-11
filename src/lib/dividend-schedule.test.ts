import { describe, expect, it } from "vitest";
import {
  dividendTwd,
  estimatePayDate,
  projectMonthlyDividends,
  type DividendHolding,
} from "./dividend-schedule";

const TODAY = "2026-11-03";

function holding(
  overrides: Partial<DividendHolding> & Pick<DividendHolding, "symbol">,
): DividendHolding {
  return {
    name: null,
    market: "TW",
    shares: 1000,
    isEtf: false,
    events: [],
    ...overrides,
  };
}

describe("estimatePayDate", () => {
  it("台股除息後約 24 天", () => {
    expect(estimatePayDate("2026-11-17", "TW", true)).toBe("2026-12-11");
  });

  it("美股 ETF 約 4 天、個股約 3 週", () => {
    expect(estimatePayDate("2026-12-21", "US", true)).toBe("2026-12-25");
    expect(estimatePayDate("2026-11-19", "US", false)).toBe("2026-12-10");
  });
});

describe("dividendTwd", () => {
  it("台股單筆未滿 2 萬照原額", () => {
    expect(dividendTwd(5081, 3.88, "TW", 32)).toBe(19714);
  });

  it("台股單筆滿 2 萬扣 2.11% 二代健保補充保費（四捨五入至元）", () => {
    // 6300 × 7 = 44,100；保費 930.51 → 931
    expect(dividendTwd(6300, 7, "TW", 32)).toBe(44100 - 931);
  });

  it("台股單筆剛好 2 萬也要扣", () => {
    expect(dividendTwd(10000, 2, "TW", 32)).toBe(20000 - 422);
  });

  it("美股不扣二代健保", () => {
    expect(dividendTwd(1000, 1, "US", 30)).toBe(Math.round(1000 * 30 * 0.7));
  });

  it("美股換匯並扣 30% 預扣稅", () => {
    expect(dividendTwd(11, 0.98, "US", 32.66)).toBe(
      Math.round(11 * 0.98 * 32.66 * 0.7),
    );
  });
});

describe("projectMonthlyDividends", () => {
  it("列出含當月起 12 個月，沒有配息的月份為 0", () => {
    const result = projectMonthlyDividends([], TODAY, 32);
    expect(result.map((m) => m.month)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
      "2027-10",
    ]);
    expect(result.every((m) => m.totalTwd === 0)).toBe(true);
  });

  it("半年配：去年同期往後推一年，金額沿用去年同期", () => {
    const result = projectMonthlyDividends(
      [
        holding({
          symbol: "006208",
          isEtf: true,
          shares: 5081,
          events: [
            { exDate: "2025-11-18", amount: 3.448 },
            { exDate: "2026-07-16", amount: 4.75 },
          ],
        }),
      ],
      TODAY,
      32,
    );
    const dec = result.find((m) => m.month === "2026-12");
    expect(dec?.items).toHaveLength(1);
    expect(dec?.items[0]).toMatchObject({
      exDate: "2026-11-18",
      perShare: 3.448,
      amountTwd: Math.round(5081 * 3.448),
      projected: true,
    });
    const aug = result.find((m) => m.month === "2027-08");
    expect(aug?.items[0]).toMatchObject({ perShare: 4.75, projected: true });
  });

  it("季配：推估金額用最近一期，台積電 12 月除息落在 1 月入帳", () => {
    const result = projectMonthlyDividends(
      [
        holding({
          symbol: "2330",
          shares: 6300,
          events: [
            { exDate: "2025-12-11", amount: 5 },
            { exDate: "2026-03-17", amount: 6 },
            { exDate: "2026-06-11", amount: 6 },
            { exDate: "2026-09-16", amount: 7 },
          ],
        }),
      ],
      TODAY,
      32,
    );
    expect(result.find((m) => m.month === "2026-12")?.totalTwd).toBe(0);
    const jan = result.find((m) => m.month === "2027-01");
    expect(jan?.items[0]).toMatchObject({
      exDate: "2026-12-11",
      perShare: 7,
      // 單筆滿 2 萬扣二代健保 2.11%
      amountTwd: 44100 - 931,
    });
  });

  it("已除息但尚未發放的配息照實際金額列入當月", () => {
    const result = projectMonthlyDividends(
      [
        holding({
          symbol: "AAA",
          events: [{ exDate: "2026-10-25", amount: 2 }],
        }),
      ],
      TODAY,
      32,
    );
    const nov = result.find((m) => m.month === "2026-11");
    expect(nov?.items[0]).toMatchObject({
      exDate: "2026-10-25",
      payDate: "2026-11-18",
      amountTwd: 2000,
      projected: false,
    });
  });

  it("美股換算台幣，同月多檔加總並依發放日排序", () => {
    const result = projectMonthlyDividends(
      [
        holding({
          symbol: "VOO",
          market: "US",
          isEtf: true,
          shares: 100,
          events: [
            { exDate: "2025-12-22", amount: 1.85 },
            { exDate: "2026-03-26", amount: 1.8 },
            { exDate: "2026-06-29", amount: 1.75 },
            { exDate: "2026-09-28", amount: 1.9 },
          ],
        }),
        holding({
          symbol: "MSFT",
          market: "US",
          shares: 10,
          events: [
            { exDate: "2025-11-20", amount: 0.91 },
            { exDate: "2026-02-19", amount: 0.91 },
            { exDate: "2026-05-21", amount: 0.91 },
            { exDate: "2026-08-20", amount: 0.98 },
          ],
        }),
      ],
      TODAY,
      30,
    );
    const dec = result.find((m) => m.month === "2026-12");
    expect(dec?.items.map((i) => i.symbol)).toEqual(["MSFT", "VOO"]);
    // 美股扣 30% 預扣稅
    expect(dec?.totalTwd).toBe(
      Math.round(10 * 0.98 * 30 * 0.7) + Math.round(100 * 1.9 * 30 * 0.7),
    );
  });

  it("推估日與既有紀錄相近時視為同一期，不重複計入", () => {
    const result = projectMonthlyDividends(
      [
        holding({
          symbol: "BBB",
          events: [
            { exDate: "2025-11-05", amount: 1 },
            { exDate: "2026-11-02", amount: 1 },
          ],
        }),
      ],
      TODAY,
      32,
    );
    const total = result.reduce((sum, m) => sum + m.items.length, 0);
    expect(total).toBe(1);
  });
});
