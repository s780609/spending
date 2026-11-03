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

/** 單次配息事件：除息日（YYYY-MM-DD，台北時區）與每股金額（原幣別） */
export interface DividendEvent {
  exDate: string;
  amount: number;
}

/** 近 12 個月配息紀錄；isEtf 用於推估發放日（美股 ETF 與個股發放間隔不同） */
export interface DividendHistory {
  events: DividendEvent[];
  isEtf: boolean;
}

const EX_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
});

async function fetchYahooDividends(
  symbol: string,
): Promise<DividendHistory | null> {
  try {
    const res = await fetch(
      `${YAHOO_CHART}${encodeURIComponent(symbol)}?range=1y&interval=1mo&events=div`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return null;
    }
    // 近一年無配息時 events 不存在，視為空陣列（與「抓失敗 null」區分）
    const dividends = result.events?.dividends;
    const events: DividendEvent[] = [];
    if (dividends && typeof dividends === "object") {
      for (const event of Object.values(dividends)) {
        const { amount, date } = (event ?? {}) as {
          amount?: unknown;
          date?: unknown;
        };
        if (
          typeof amount === "number" &&
          Number.isFinite(amount) &&
          typeof date === "number" &&
          Number.isFinite(date)
        ) {
          events.push({
            exDate: EX_DATE_FORMAT.format(new Date(date * 1000)),
            amount,
          });
        }
      }
    }
    events.sort((a, b) => a.exDate.localeCompare(b.exDate));
    return { events, isEtf: result.meta?.instrumentType === "ETF" };
  } catch {
    return null;
  }
}

/**
 * 近 12 個月配息紀錄（每股、原幣別），作為年度與各月配息估算。
 * 台股代號補後綴邏輯同 fetchQuote；抓不到回 null，無配息回空陣列。
 */
export async function fetchDividendHistory(
  market: string,
  symbol: string,
): Promise<DividendHistory | null> {
  if (market === "TW" && !symbol.includes(".")) {
    return (
      (await fetchYahooDividends(`${symbol}.TW`)) ??
      fetchYahooDividends(`${symbol}.TWO`)
    );
  }
  return fetchYahooDividends(symbol);
}
