import { describe, expect, it } from "vitest";
import { summarizeAssets } from "./asset-dashboard";

const holdings = [
  { market: "TW", broker: "玉山證券", symbol: "2330", name: "台積電", shares: 1000, price: 2000, valueTwd: 2_000_000 },
  { market: "TW", broker: "聯邦證券", symbol: "0050", name: null, shares: 1000, price: 100, valueTwd: 100_000 },
  { market: "TW", broker: "玉山證券", symbol: "0050", name: null, shares: 2000, price: 100, valueTwd: 200_000 },
  { market: "US", broker: "玉山證券", symbol: "VOO", name: null, shares: 10, price: 500, valueTwd: 160_000 },
  { market: "US", broker: "Firstrade", symbol: "VOO", name: null, shares: 5, price: 500, valueTwd: 80_000 },
  { market: "US", broker: "Firstrade", symbol: "IBIT", name: null, shares: 0, price: 40, valueTwd: 0 },
];

describe("summarizeAssets 資產頁儀表板匯總", () => {
  const summary = summarizeAssets(holdings);
  const total = 2_540_000;

  it("台股／美股配置：依市場加總市值與占比，台股在前", () => {
    expect(summary.marketSplit).toEqual([
      { market: "TW", valueTwd: 2_300_000, share: 2_300_000 / total },
      { market: "US", valueTwd: 240_000, share: 240_000 / total },
    ]);
  });

  it("各持股：同代號跨券商合併、市值 0 不列入、由大到小", () => {
    expect(summary.bySymbol.map((s) => [s.symbol, s.valueTwd])).toEqual([
      ["2330", 2_000_000],
      ["0050", 300_000],
      ["VOO", 240_000],
    ]);
    expect(summary.bySymbol[0].name).toBe("台積電");
    expect(summary.bySymbol[0].share).toBeCloseTo(2_000_000 / total);
  });

  it("各券商：同券商不同市場分開列，美股附原幣市值，由大到小", () => {
    expect(summary.byBroker).toEqual([
      { broker: "玉山證券", market: "TW", valueTwd: 2_200_000, valueUsd: null },
      { broker: "玉山證券", market: "US", valueTwd: 160_000, valueUsd: 5000 },
      { broker: "聯邦證券", market: "TW", valueTwd: 100_000, valueUsd: null },
      { broker: "Firstrade", market: "US", valueTwd: 80_000, valueUsd: 2500 },
    ]);
  });

  it("美股總市值（美元）= 股數 × 原幣股價加總", () => {
    expect(summary.usTotalUsd).toBe(7500);
  });

  it("沒有持股時占比為 0、不會除以 0", () => {
    const empty = summarizeAssets([]);
    expect(empty.marketSplit.every((m) => m.share === 0)).toBe(true);
    expect(empty.bySymbol).toEqual([]);
    expect(empty.byBroker).toEqual([]);
    expect(empty.usTotalUsd).toBe(0);
  });
});
