/** 資產頁儀表板用的持股欄位（HoldingView 的子集） */
export interface DashboardHolding {
  market: string;
  broker: string;
  symbol: string;
  name: string | null;
  shares: number;
  /** 原幣別股價 */
  price: number;
  valueTwd: number;
}

export interface AssetSummary {
  /** 台股在前、美股在後；share = 占持股總市值比例 */
  marketSplit: { market: string; valueTwd: number; share: number }[];
  /** 同代號跨券商合併，市值 0 不列入，由大到小 */
  bySymbol: {
    symbol: string;
    name: string | null;
    market: string;
    valueTwd: number;
    share: number;
  }[];
  /** 券商 × 市場，由大到小；美股附原幣（美元）市值 */
  byBroker: {
    broker: string;
    market: string;
    valueTwd: number;
    valueUsd: number | null;
  }[];
  /** 美股總市值（美元） */
  usTotalUsd: number;
}

export function summarizeAssets(holdings: DashboardHolding[]): AssetSummary {
  const total = holdings.reduce((sum, h) => sum + h.valueTwd, 0);
  const shareOf = (value: number) => (total > 0 ? value / total : 0);

  const marketSplit = ["TW", "US"].map((market) => {
    const valueTwd = holdings
      .filter((h) => h.market === market)
      .reduce((sum, h) => sum + h.valueTwd, 0);
    return { market, valueTwd, share: shareOf(valueTwd) };
  });

  const symbols = new Map<string, AssetSummary["bySymbol"][number]>();
  for (const h of holdings) {
    const entry = symbols.get(h.symbol);
    if (entry) {
      entry.valueTwd += h.valueTwd;
      if (!entry.name && h.name) entry.name = h.name;
    } else {
      symbols.set(h.symbol, {
        symbol: h.symbol,
        name: h.name,
        market: h.market,
        valueTwd: h.valueTwd,
        share: 0,
      });
    }
  }
  const bySymbol = [...symbols.values()]
    .filter((s) => s.valueTwd > 0)
    .map((s) => ({ ...s, share: shareOf(s.valueTwd) }))
    .sort((a, b) => b.valueTwd - a.valueTwd);

  const brokers = new Map<string, AssetSummary["byBroker"][number]>();
  for (const h of holdings) {
    const key = `${h.broker}|${h.market}`;
    const usd = h.market === "US" ? h.shares * h.price : null;
    const entry = brokers.get(key);
    if (entry) {
      entry.valueTwd += h.valueTwd;
      if (usd !== null) entry.valueUsd = (entry.valueUsd ?? 0) + usd;
    } else {
      brokers.set(key, {
        broker: h.broker,
        market: h.market,
        valueTwd: h.valueTwd,
        valueUsd: usd,
      });
    }
  }
  const byBroker = [...brokers.values()]
    .filter((b) => b.valueTwd > 0)
    .sort((a, b) => b.valueTwd - a.valueTwd);

  const usTotalUsd = holdings
    .filter((h) => h.market === "US")
    .reduce((sum, h) => sum + h.shares * h.price, 0);

  return { marketSplit, bySymbol, byBroker, usTotalUsd };
}
