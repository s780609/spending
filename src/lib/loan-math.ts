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
