import { shiftMonth } from "./dates";
import type { DividendEvent } from "./prices";

/**
 * 除息日到發放日的估計天數（Yahoo 只給除息日，發放日依慣例推估）：
 * 台股約 3–4 週（台積電 28、聯發科 24、006208 23、0050 20 天）；
 * 美股 ETF 約 2–5 天（VOO、QQQ）；美股個股約 3 週（MSFT、NVDA）。
 */
const PAY_LAG_DAYS = { TW: 24, US_ETF: 4, US_STOCK: 21 } as const;

/** 推估的除息日與實際除息日相差在此天數內，視為同一期配息（避免重複計入） */
const SAME_PAYOUT_DAYS = 20;

/** 一年配息達此次數（季配以上）時，推估金額用最近一期；否則用去年同期 */
const FREQUENT_PAYOUTS = 4;

export interface DividendHolding {
  symbol: string;
  name: string | null;
  market: string;
  shares: number;
  isEtf: boolean;
  /** 近 12 個月配息紀錄，由舊到新 */
  events: DividendEvent[];
}

export interface MonthlyDividendItem {
  symbol: string;
  name: string | null;
  market: string;
  /** 除息日 YYYY-MM-DD */
  exDate: string;
  /** 推估發放日 YYYY-MM-DD */
  payDate: string;
  /** 每股金額（原幣別） */
  perShare: number;
  amountTwd: number;
  /** true＝依去年同期推估的除息；false＝已除息（實際紀錄），僅發放日為估計 */
  projected: boolean;
}

export interface MonthlyDividend {
  /** YYYY-MM */
  month: string;
  totalTwd: number;
  items: MonthlyDividendItem[];
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addYear(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  // 2/29 遇平年由 Date 自動進位到 3/1，推估用途可接受
  const d = new Date(Date.UTC(year + 1, month - 1, day));
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
  );
}

/** 依市場與是否為 ETF 推估發放日 */
export function estimatePayDate(
  exDate: string,
  market: string,
  isEtf: boolean,
): string {
  const lag =
    market === "TW"
      ? PAY_LAG_DAYS.TW
      : isEtf
        ? PAY_LAG_DAYS.US_ETF
        : PAY_LAG_DAYS.US_STOCK;
  return addDays(exDate, lag);
}

/**
 * 推估未來 months 個月（含 today 當月）每月的股利入帳（以台幣計、稅前）。
 * - 已除息、推估發放日落在當月或之後的配息：照實際金額列入
 * - 近 12 個月每一期配息往後推一年，作為下一次同期配息；
 *   金額季配以上用最近一期（反映調升），半年／年配用去年同期（上下半年金額常不同）
 * 每月內依發放日排序；沒有入帳的月份也會列出（totalTwd = 0）。
 */
export function projectMonthlyDividends(
  holdings: readonly DividendHolding[],
  today: string,
  usdTwd: number,
  months = 12,
): MonthlyDividend[] {
  const firstMonth = today.slice(0, 7);
  const monthList = Array.from({ length: months }, (_, i) =>
    shiftMonth(firstMonth, i),
  );
  const lastMonth = monthList[monthList.length - 1];
  const byMonth = new Map<string, MonthlyDividendItem[]>(
    monthList.map((month) => [month, []]),
  );

  for (const holding of holdings) {
    if (holding.shares <= 0 || holding.events.length === 0) {
      continue;
    }
    const fx = holding.market === "US" ? usdTwd : 1;
    const latestAmount = holding.events[holding.events.length - 1].amount;
    const frequent = holding.events.length >= FREQUENT_PAYOUTS;

    const push = (exDate: string, perShare: number, projected: boolean) => {
      const payDate = estimatePayDate(exDate, holding.market, holding.isEtf);
      const month = payDate.slice(0, 7);
      if (month < firstMonth || month > lastMonth) {
        return;
      }
      byMonth.get(month)?.push({
        symbol: holding.symbol,
        name: holding.name,
        market: holding.market,
        exDate,
        payDate,
        perShare,
        amountTwd: Math.round(holding.shares * perShare * fx),
        projected,
      });
    };

    for (const event of holding.events) {
      push(event.exDate, event.amount, false);

      const nextExDate = addYear(event.exDate);
      const alreadyRecorded = holding.events.some(
        (other) => daysBetween(other.exDate, nextExDate) <= SAME_PAYOUT_DAYS,
      );
      if (!alreadyRecorded) {
        push(nextExDate, frequent ? latestAmount : event.amount, true);
      }
    }
  }

  return monthList.map((month) => {
    const items = (byMonth.get(month) ?? []).sort(
      (a, b) =>
        a.payDate.localeCompare(b.payDate) || b.amountTwd - a.amountTwd,
    );
    return {
      month,
      totalTwd: items.reduce((sum, item) => sum + item.amountTwd, 0),
      items,
    };
  });
}
