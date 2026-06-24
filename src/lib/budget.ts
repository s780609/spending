export interface BudgetStatus {
  category: string;
  /** 月預算金額 */
  budget: number;
  /** 該月此分類已花費 */
  spent: number;
  /** 是否超出預算 */
  over: boolean;
  /** 已使用比例（0~1+，預算為 0 時回傳 0） */
  ratio: number;
}

/**
 * 純函式：把預算設定與當月各分類花費合併成狀態列表。
 * spentByCategory 的 key 為分類名稱、value 為該月花費總額。
 */
export function computeBudgetStatus(
  budgets: { category: string; amount: number | string }[],
  spentByCategory: Map<string, number>,
): BudgetStatus[] {
  return budgets.map(({ category, amount }) => {
    const budget = Number(amount);
    const spent = spentByCategory.get(category) ?? 0;
    return {
      category,
      budget,
      spent,
      over: spent > budget,
      ratio: budget > 0 ? spent / budget : 0,
    };
  });
}

export interface BudgetProjection extends BudgetStatus {
  /** 前 N 個完整月（不含當月）的每月平均花費 */
  average: number;
  /** 預估本月底花費，取「當月已花」與「歷史平均」較大者 */
  projected: number;
  /** 預估是否會超支（即使當月實際尚未超出） */
  projectedOver: boolean;
  /** 預估使用比例（0~1+，預算為 0 時回傳 0） */
  projectedRatio: number;
  /** 回看的完整月份數 N（不含當月） */
  lookback: number;
  /** 前 N 個月實際花費「總額」 */
  trailingSpent: number;
  /** 前 N 個月的預算門檻＝月預算 × N */
  trailingBudget: number;
  /** 前 N 個月總額是否超過 月預算 × N */
  trailingOver: boolean;
  /** 前 N 個月使用比例（trailingBudget 為 0 時回傳 0） */
  trailingRatio: number;
}

/**
 * 純函式：在當月花費之外，提供兩種以「前 N 個完整月（不含當月）」為基礎的視角。
 * 因為發票/帳單資料延遲、當月實際幾乎為 0：
 *  - 投影：用每月平均推估「本月底會花多少」，提早警示是否會爆當月預算；
 *  - 前 N 月：用實際總額對比「月預算 × N」，以完整資料檢視這段期間是否超支。
 * trailingByCategory 的 value 為該分類前 N 個完整月的花費「總額」。
 */
export function computeBudgetProjection(
  budgets: { category: string; amount: number | string }[],
  spentByCategory: Map<string, number>,
  trailingByCategory: Map<string, number>,
  lookback = 3,
): BudgetProjection[] {
  return computeBudgetStatus(budgets, spentByCategory).map((s) => {
    const trailingSpent = trailingByCategory.get(s.category) ?? 0;
    const average = lookback > 0 ? trailingSpent / lookback : 0;
    const projected = Math.max(s.spent, average);
    const trailingBudget = s.budget * lookback;
    return {
      ...s,
      average,
      projected,
      projectedOver: projected > s.budget,
      projectedRatio: s.budget > 0 ? projected / s.budget : 0,
      lookback,
      trailingSpent,
      trailingBudget,
      trailingOver: trailingSpent > trailingBudget,
      trailingRatio: trailingBudget > 0 ? trailingSpent / trailingBudget : 0,
    };
  });
}
