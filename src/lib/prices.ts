const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/";

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${YAHOO_CHART}${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

/**
 * 抓單檔即時價（原幣別）。
 * 台股純數字代號自動補 .TW，抓不到再試 .TWO（上櫃）；
 * 已含後綴（如 5483.TWO）或美股代號直接查。
 */
export async function fetchQuote(
  market: string,
  symbol: string,
): Promise<number | null> {
  if (market === "TW" && !symbol.includes(".")) {
    return (
      (await fetchYahooPrice(`${symbol}.TW`)) ??
      fetchYahooPrice(`${symbol}.TWO`)
    );
  }
  return fetchYahooPrice(symbol);
}

/** 美金兌台幣匯率 */
export async function fetchUsdTwd(): Promise<number | null> {
  return fetchYahooPrice("TWD=X");
}
