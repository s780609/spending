import { DEFAULT_CATEGORY, type Category } from "./categories";

/**
 * 自動分類規則：由上而下逐條比對，先中先贏。
 * 關鍵字同時比對「店名 + 所有品項名稱」，英文不分大小寫。
 * 要調整分類行為，直接增刪下面的關鍵字即可。
 */
const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "訂閱",
    keywords: [
      "youtube", "netflix", "spotify", "icloud", "google one", "chatgpt", "訂閱",
      "github", "hbo", "prime video", "disney", "無廣告",
    ],
  },
  {
    // 注意：不放「捷運」，分店名稱常含捷運站名（如「捷運雙連門市」）會誤判
    category: "交通",
    keywords: [
      "加油站", "汽油", "無鉛", "柴油", "停車", "parking", "嘟嘟房", "歐特儀",
      "展昭", "中油", "高鐵", "台鐵", "客運",
    ],
  },
  {
    category: "手遊",
    keywords: ["妮姬"],
  },
  {
    category: "娛樂",
    keywords: [
      "影城", "電影", "門票", "博物館", "遊戲", "玩具", "博客來", "密斯特喬",
      "電玩", "ps5", "ps4", "switch", "xbox", "任天堂", "sony",
      "誠品", "城邦", "學思行",
      "klook", "客路", "booking", "百樂園", "傳藝", "藝術中心", "溫泉",
      "peach avia", "樂桃", "宜睿",
    ],
  },
  {
    // 注意：刻意不用「醫療」當關鍵字，避免在杏一買飲料也被歸到醫療
    category: "醫療",
    keywords: ["藥局", "藥妝", "診所", "醫院", "牙醫", "掛號費", "普拿疼", "斯斯"],
  },
  {
    category: "保險",
    keywords: ["保險", "人壽", "產險", "保費"],
  },
  {
    category: "其他",
    keywords: ["幣託", "交易處理費", "手續費", "運費", "速達"],
  },
  {
    // 使用者指定：全聯一律歸日用，須優先於品項的飲食關鍵字
    category: "日用",
    keywords: ["全聯"],
  },
  {
    category: "飲食",
    keywords: [
      "餐", "料理", "便當", "鮮食", "點心", "烘焙", "甜品", "甜點", "美食", "小吃", "食品",
      "咖啡", "美式", "拿鐵", "茶", "奶", "乳", "果汁", "汁", "可樂", "汽水", "飲", "糖",
      "酒", "吟釀", "威士忌", "星冰樂", "優格", "豆漿", "養樂多", "可可", "檸檬", "蜂蜜", "寶礦力",
      "麵包", "吐司", "蛋糕", "餅", "三明治", "果凍", "爆米花", "飯", "麵", "堡", "薯", "地瓜", "炸",
      "雞", "豬", "牛", "魚", "蛋", "葡萄", "蘋果", "草莓", "水果", "壽司",
      "星巴克", "麥當勞", "肯德基", "阿默", "薩莉亞", "小柴",
      "超商", "便利商店", "全家便利", "美廉社", "美聯社", "三商家購",
    ],
  },
  {
    category: "日用",
    keywords: [
      "衛生紙", "洗衣", "沐浴", "洗髮", "牙膏", "菜瓜布", "清潔", "電池", "塑膠袋",
      "服飾", "服裝", "衣", "褲", "鞋", "襪",
      "嬰", "濕巾", "宜家", "ikea", "宜得利", "卡多摩",
      "coupang", "酷澎", "momo", "outlet", "寶雅", "富邦媒體", "網路家庭",
    ],
  },
];

export function autoCategory(vendor: string, itemNames: string[]): Category {
  // NFKC 把全形英數（如信用卡帳單的ＣＯＵＰＡＮＧ）折成半形再比對
  const text = [vendor, ...itemNames]
    .join(" ")
    .normalize("NFKC")
    .toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }
  return DEFAULT_CATEGORY;
}
