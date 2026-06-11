import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { fxRates, holdings, loans, networthSnapshots } from "@/db/schema";
import { todayTaipei } from "./dates";
import { creditLoanStatus, pledgeStatus } from "./loan-math";
import { fetchQuote, fetchUsdTwd } from "./prices";

export interface HoldingView {
  id: number;
  market: string;
  broker: string;
  symbol: string;
  name: string | null;
  shares: number;
  /** 原幣別股價；抓不到且無快取時為 0 */
  price: number;
  /** true 表示用的是快取舊價（本次抓取失敗） */
  priceStale: boolean;
  valueTwd: number;
}

export interface LoanView {
  id: number;
  name: string;
  type: string;
  principal: number;
  annualRate: number;
  startDate: string;
  installments: number | null;
  termEnd: string | null;
  /** 質押＝累計利息；信貸＝累計已付利息 */
  interest: number;
  /** 計入資產負債表的負債金額：質押＝本金+利息；信貸＝剩餘本金 */
  liability: number;
  monthlyPayment: number | null;
  paymentsMade: number | null;
}

export interface BalanceSheet {
  holdings: HoldingView[];
  loans: LoanView[];
  usdTwd: number;
  fxStale: boolean;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  /** 總資產 / 淨資產；淨資產 <= 0 時為 null */
  leverage: number | null;
  /** 所有價格與匯率都可信（可寫入每日快照） */
  reliable: boolean;
}

export async function computeBalanceSheet(): Promise<BalanceSheet> {
  const db = getDb();
  const [holdingRows, loanRows] = await Promise.all([
    db.select().from(holdings),
    db.select().from(loans),
  ]);

  // 匯率：抓到就更新快取，抓不到用快取墊底
  let usdTwd = await fetchUsdTwd();
  let fxStale = false;
  if (usdTwd !== null) {
    await db
      .insert(fxRates)
      .values({ pair: "USDTWD", rate: String(usdTwd), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: fxRates.pair,
        set: { rate: String(usdTwd), updatedAt: new Date() },
      });
  } else {
    const cached = await db
      .select()
      .from(fxRates)
      .where(eq(fxRates.pair, "USDTWD"));
    usdTwd = cached.length > 0 ? Number(cached[0].rate) : 0;
    fxStale = true;
  }

  const quotes = await Promise.all(
    holdingRows.map((row) => fetchQuote(row.market, row.symbol)),
  );

  const holdingViews: HoldingView[] = [];
  for (let i = 0; i < holdingRows.length; i++) {
    const row = holdingRows[i];
    let price = quotes[i];
    let priceStale = false;
    if (price !== null) {
      await db
        .update(holdings)
        .set({ lastPrice: String(price), lastPriceAt: new Date() })
        .where(eq(holdings.id, row.id));
    } else {
      price = row.lastPrice !== null ? Number(row.lastPrice) : 0;
      priceStale = true;
    }
    const shares = Number(row.shares);
    holdingViews.push({
      id: row.id,
      market: row.market,
      broker: row.broker,
      symbol: row.symbol,
      name: row.name,
      shares,
      price,
      priceStale,
      valueTwd: shares * price * (row.market === "US" ? usdTwd : 1),
    });
  }

  // 台股在前、美股在後；同市場內按市值由大到小
  holdingViews.sort((a, b) =>
    a.market === b.market
      ? b.valueTwd - a.valueTwd
      : a.market.localeCompare(b.market),
  );

  const today = todayTaipei();
  const loanViews: LoanView[] = loanRows.map((row) => {
    const principal = Number(row.principal);
    const annualRate = Number(row.annualRate);
    const base = {
      id: row.id,
      name: row.name,
      type: row.type,
      principal,
      annualRate,
      startDate: row.startDate,
      installments: row.installments,
      termEnd: row.termEnd,
    };
    if (row.type === "信貸" && row.installments) {
      const status = creditLoanStatus(
        principal,
        annualRate,
        row.startDate,
        row.installments,
        today,
      );
      return {
        ...base,
        interest: status.interestPaid,
        liability: status.remainingPrincipal,
        monthlyPayment: status.monthlyPayment,
        paymentsMade: status.paymentsMade,
      };
    }
    const status = pledgeStatus(principal, annualRate, row.startDate, today);
    return {
      ...base,
      interest: status.interest,
      liability: status.total,
      monthlyPayment: null,
      paymentsMade: null,
    };
  });

  const totalAssets = holdingViews.reduce((sum, h) => sum + h.valueTwd, 0);
  const totalLiabilities = loanViews.reduce((sum, l) => sum + l.liability, 0);
  const netWorth = totalAssets - totalLiabilities;
  const leverage = netWorth > 0 ? totalAssets / netWorth : null;
  const reliable =
    !holdingViews.some((h) => h.priceStale && h.price === 0) &&
    !(fxStale && holdingViews.some((h) => h.market === "US" && usdTwd === 0));

  return {
    holdings: holdingViews,
    loans: loanViews,
    usdTwd,
    fxStale,
    totalAssets,
    totalLiabilities,
    netWorth,
    leverage,
    reliable,
  };
}

/** 計算並寫入（upsert）今日快照；價格不可信時只回傳不寫入 */
export async function recordDailySnapshot(): Promise<BalanceSheet> {
  const sheet = await computeBalanceSheet();
  if (!sheet.reliable || sheet.holdings.length + sheet.loans.length === 0) {
    return sheet;
  }
  const values = {
    date: todayTaipei(),
    totalAssets: sheet.totalAssets.toFixed(2),
    totalLiabilities: sheet.totalLiabilities.toFixed(2),
    netWorth: sheet.netWorth.toFixed(2),
    leverage: sheet.leverage === null ? null : sheet.leverage.toFixed(4),
  };
  await getDb()
    .insert(networthSnapshots)
    .values(values)
    .onConflictDoUpdate({ target: networthSnapshots.date, set: values });
  return sheet;
}
