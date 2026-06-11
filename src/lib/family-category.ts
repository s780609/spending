export const FAMILY_CATEGORIES = [
  "生活費",
  "水電瓦斯",
  "電信",
  "卡費",
  "房租",
  "內部轉帳",
  "利息",
  "其他",
  "未分類",
] as const;

export type FamilyCategory = (typeof FAMILY_CATEGORIES)[number];

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
