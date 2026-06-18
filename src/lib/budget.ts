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
