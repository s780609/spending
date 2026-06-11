import { DEFAULT_CATEGORY, type Category } from "./categories";

/**
 * 自動分類規則：由上而下逐條比對，先中先贏。
 * 關鍵字同時比對「店名 + 所有品項名稱」，英文不分大小寫。
 * 要調整分類行為，直接增刪下面的關鍵字即可。
 */
const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "訂閱",
    keywords: ["youtube", "netflix", "spotify", "icloud", "google one", "chatgpt", "訂閱"],
  },
  {
    // 注意：不放「捷運」，分店名稱常含捷運站名（如「捷運雙連門市」）會誤判
    category: "交通",
    keywords: ["加油站", "汽油", "柴油", "停車", "中油", "高鐵", "台鐵", "客運"],
  },
  {
    category: "娛樂",
    keywords: ["影城", "電影", "門票", "博物館", "遊戲", "博客來", "密斯特喬"],
  },
  {
    // 注意：刻意不用「醫療」當關鍵字，避免在杏一買飲料也被歸到醫療
    category: "醫療",
    keywords: ["藥局", "藥妝", "診所", "醫院", "牙醫", "掛號費"],
  },
  {
    category: "保險",
    keywords: ["保險", "人壽", "產險", "保費"],
  },
  {
    category: "其他",
    keywords: ["幣託", "交易處理費", "手續費"],
  },
  {
    category: "飲食",
    keywords: [
      "餐飲", "餐廳", "料理", "便當", "鮮食", "點心", "烘焙",
      "咖啡", "美式", "拿鐵", "茶", "奶", "乳", "果汁", "可樂", "汽水", "飲",
      "麵包", "吐司", "蛋糕", "飯", "麵", "堡", "薯", "地瓜",
      "雞", "豬", "牛", "魚", "蛋", "葡萄", "蘋果",
      "星巴克", "麥當勞", "肯德基", "阿默",
    ],
  },
  {
    category: "日用",
    keywords: ["衛生紙", "洗衣", "沐浴", "洗髮", "牙膏", "菜瓜布", "清潔", "電池", "塑膠袋"],
  },
];

export function autoCategory(vendor: string, itemNames: string[]): Category {
  const text = [vendor, ...itemNames].join(" ").toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }
  return DEFAULT_CATEGORY;
}
