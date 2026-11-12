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

export type FamilySource = "all" | "bank" | "card";

/** 依來源挑出圖表用的「月 × 分類」加總；合併＝帳戶排除 MERGED_EXCLUDED_BANK_CATEGORIES＋信用卡排除 MERGED_EXCLUDED_CARD_CATEGORIES */
export function familyEntriesBySource<T extends { category: string }>(
  bank: readonly T[],
  card: readonly T[],
  source: FamilySource,
): T[] {
  if (source === "bank") {
    return [...bank];
  }
  if (source === "card") {
    return [...card];
  }
  return [
    ...bank.filter(
      (entry) => !MERGED_EXCLUDED_BANK_CATEGORIES.includes(entry.category),
    ),
    ...card.filter(
      (entry) => !MERGED_EXCLUDED_CARD_CATEGORIES.includes(entry.category),
    ),
  ];
}

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
 * 在此補上，優先於 autoCategory。先中先贏；包含即算（前綴「連加＊」為 LINE Pay）。
 */
const CARD_RULES: { category: FamilyCategory; keywords: string[] }[] = [
  // 使用者指定：欣泰瓦斯費 → 水電瓦斯
  { category: "水電瓦斯", keywords: ["欣泰"] },
  // 使用者指定：Xpark（卡單為全形「Ｘｐａｒｋ」）、兒童新樂園、小人國、力行國際貿易 → 娛樂
  {
    category: "娛樂",
    keywords: ["Ｘｐａｒｋ", "Xpark", "兒童新樂園", "小人國", "力行國際貿易"],
  },
  // 使用者指定：萊爾富、85°C（卡單為全形「８５˚Ｃ」）、八方雲集、WU GU QU GONG → 飲食
  {
    category: "飲食",
    keywords: ["萊爾富", "８５˚Ｃ", "85°C", "八方雲集", "WU GU QU GONG"],
  },
  // 使用者指定：悠遊卡自動加值（台北捷運）→ 交通
  { category: "交通", keywords: ["悠遊卡自動加值", "台北捷運"] },
];

/** LINE Pay 小額門檻：未滿此金額且無其他規則命中時歸飲食 */
const LINE_PAY_SMALL_AMOUNT = 200;

/**
 * 信用卡明細自動分類：先套家庭專屬規則，再重用消費關鍵字規則映射進家庭分類，
 * 都沒中時 LINE Pay 小額歸飲食
 */
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
  if (isFamilyCategory(guess) && guess !== "未分類") {
    return guess;
  }
  // 使用者指定：其他規則都沒中時，LINE Pay（「連加」開頭）小額消費多為餐飲
  if (description.startsWith("連加") && Math.abs(amount) < LINE_PAY_SMALL_AMOUNT) {
    return "飲食";
  }
  return "未分類";
}
