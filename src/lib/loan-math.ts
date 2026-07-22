/** 兩個 YYYY-MM-DD 之間經過的整天數 */
function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export interface PledgeStatus {
  /** 已經過天數 */
  days: number;
  /** 累計利息 */
  interest: number;
  /** 本金 + 利息 */
  total: number;
}

/** 質押：本金不變，利息按日累積（年利率 / 365） */
export function pledgeStatus(
  principal: number,
  annualRatePct: number,
  startDate: string,
  today: string,
): PledgeStatus {
  const days = Math.max(0, daysBetween(startDate, today));
  const interest = (principal * (annualRatePct / 100) * days) / 365;
  return { days, interest, total: principal + interest };
}

export interface PledgeExtension {
  /** 目前這期的展期期限 YYYY-MM-DD */
  deadline: string;
  /** 距離期限的天數（負值代表已超期，尚未申請展期） */
  daysRemaining: number;
  /** 第幾期展期（1 = 首期，2 = 已展延一次…） */
  period: number;
}

/**
 * 質押展期：借貸日起每 6 個月須申請展期一次，
 * 展期期限 = 借貸日 + 期次 × 6 個月 − 1 天。
 * 期次由「已申請展期次數」決定：extensionCount = 0 時為首期，
 * 每按一次「已申請展期」次數 +1，期限即往後一期。
 * 逾期（daysRemaining < 0）會持續存在直到使用者確認展期，不會被時間自動略過。
 */
export function pledgeExtensionDeadline(
  startDate: string,
  today: string,
  extensionCount = 0,
): PledgeExtension {
  const [year, month, day] = startDate.split("-").map(Number);
  const period = extensionCount + 1;
  const dt = new Date(Date.UTC(year, month - 1 + 6 * period, day));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const deadline = dt.toISOString().slice(0, 10);
  const daysRemaining = Math.floor(
    (Date.parse(deadline) - Date.parse(today)) / 86_400_000,
  );
  return { deadline, daysRemaining, period };
}

export interface CreditLoanStatus {
  /** 每月固定還款額 */
  monthlyPayment: number;
  /** 已繳期數 */
  paymentsMade: number;
  /** 剩餘未償本金（資產負債表上的負債金額） */
  remainingPrincipal: number;
  /** 累計已付利息 */
  interestPaid: number;
}

/** 信貸：本息平均攤還，每月還款日為借貸日的同一號 */
export function creditLoanStatus(
  principal: number,
  annualRatePct: number,
  startDate: string,
  installments: number,
  today: string,
): CreditLoanStatus {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  const elapsed =
    (year - startYear) * 12 + (month - startMonth) + (day >= startDay ? 0 : -1);
  const paymentsMade = Math.min(Math.max(elapsed, 0), installments);

  const monthlyRate = annualRatePct / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / installments
      : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -installments);

  const growth = (1 + monthlyRate) ** paymentsMade;
  const remainingPrincipal =
    monthlyRate === 0
      ? principal - monthlyPayment * paymentsMade
      : principal * growth - (monthlyPayment * (growth - 1)) / monthlyRate;

  const interestPaid =
    monthlyPayment * paymentsMade - (principal - remainingPrincipal);

  return { monthlyPayment, paymentsMade, remainingPrincipal, interestPaid };
}
