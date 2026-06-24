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
  /** 過去數月該分類的每月平均花費 */
  average: number;
  /** 預估本月底花費，取「當月已花」與「歷史平均」較大者 */
  projected: number;
  /** 預估是否會超支（即使當月實際尚未超出） */
  projectedOver: boolean;
  /** 預估使用比例（0~1+，預算為 0 時回傳 0） */
  projectedRatio: number;
}

/**
 * 純函式：在當月花費之外，再用歷史平均推估「本月底會花多少」。
 * 因為發票/帳單資料延遲，當月實際幾乎為 0，故以歷史平均提早警示是否會爆預算。
 * avgByCategory 的 value 為該分類過去數月的每月平均花費。
 */
export function computeBudgetProjection(
  budgets: { category: string; amount: number | string }[],
  spentByCategory: Map<string, number>,
  avgByCategory: Map<string, number>,
): BudgetProjection[] {
  return computeBudgetStatus(budgets, spentByCategory).map((s) => {
    const average = avgByCategory.get(s.category) ?? 0;
    const projected = Math.max(s.spent, average);
    return {
      ...s,
      average,
      projected,
      projectedOver: projected > s.budget,
      projectedRatio: s.budget > 0 ? projected / s.budget : 0,
    };
  });
}
