export const CATEGORIES = [
  "飲食",
  "交通",
  "日用",
  "訂閱",
  "娛樂",
  "手遊",
  "醫療",
  "保險",
  "房租",
  "貸款",
  "其他",
  "未分類",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = "未分類";

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
