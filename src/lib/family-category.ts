import { autoCategory } from "./auto-category";

/** 家庭記帳專用分類，與個人記帳的 CATEGORIES 完全獨立 */
export const FAMILY_CATEGORIES = [
  "飲食",
  "日用",
  "交通",
  "娛樂",
  "醫療",
  "教育",
  "訂閱",
  "水電瓦斯",
  "電信",
  "卡費",
  "房租",
  "生活費",
  "內部轉帳",
  "利息",
  "其他",
  "未分類",
] as const;

export type FamilyCategory = (typeof FAMILY_CATEGORIES)[number];

/** 圖表「合併」檢視：帳戶側排除的分類（卡費改由卡單逐筆計入，其餘非實際消費） */
export const MERGED_EXCLUDED_BANK_CATEGORIES: readonly string[] = [
  "內部轉帳",
  "利息",
  "卡費",
  "未分類",
  "其他",
];

/** 圖表「合併」檢視：信用卡側排除的分類（繳款列不算消費） */
export const MERGED_EXCLUDED_CARD_CATEGORIES: readonly string[] = ["卡費"];

export function isFamilyCategory(value: string): value is FamilyCategory {
  return (FAMILY_CATEGORIES as readonly string[]).includes(value);
}

const RULES: { category: FamilyCategory; keywords: string[] }[] = [
  { category: "內部轉帳", keywords: ["轉出2888", "轉入2888"] },
  { category: "水電瓦斯", keywords: ["台電", "電費", "台水", "水費", "瓦斯"] },
  { category: "卡費", keywords: ["卡費"] },
  { category: "房租", keywords: ["房租"] },
  { category: "電信", keywords: ["電信", "台灣大哥大", "遠傳"] },
  { category: "利息", keywords: ["存款息", "利息"] },
  // 使用者指定：給許欣予的轉帳為教育支出
  { category: "教育", keywords: ["許欣予"] },
  { category: "生活費", keywords: ["生活費", "贊助"] },
];

/** 家庭帳戶明細自動分類：比對摘要＋備註，先中先贏 */
export function autoFamilyCategory(
  description: string,
  note: string,
): FamilyCategory {
  const text = `${description} ${note}`;
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }
  return "未分類";
}

/**
 * 信用卡店家 → 家庭分類的專屬覆寫：個人 autoCategory 不涵蓋的家庭分類（如水電瓦斯）
 * 在此補上，優先於 autoCategory。先中先贏。
 */
const CARD_RULES: { category: FamilyCategory; keywords: string[] }[] = [
  // 使用者指定：欣泰瓦斯費 → 水電瓦斯
  { category: "水電瓦斯", keywords: ["欣泰"] },
];

/** 信用卡明細自動分類：先套家庭專屬規則，再重用消費關鍵字規則映射進家庭分類 */
export function familyCardCategory(
  description: string,
  amount: number,
): FamilyCategory {
  if (
    amount < 0 &&
    ["扣繳", "繳款", "卡款"].some((kw) => description.includes(kw))
  ) {
    // 繳款（統計時排除）；一般退款則依店家分類，以負數在該分類淨掉
    return "卡費";
  }
  for (const rule of CARD_RULES) {
    if (rule.keywords.some((keyword) => description.includes(keyword))) {
      return rule.category;
    }
  }
  const guess = autoCategory(description, []);
  return isFamilyCategory(guess) ? guess : "未分類";
}
