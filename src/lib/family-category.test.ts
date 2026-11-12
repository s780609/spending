import { describe, expect, it } from "vitest";
import { autoFamilyCategory, familyCardCategory } from "./family-category";

describe("autoFamilyCategory 家庭帳戶明細", () => {
  it("常見摘要與備註自動分類", () => {
    expect(autoFamilyCategory("媒體轉出", "台電電費05605130200")).toBe(
      "水電瓦斯",
    );
    expect(autoFamilyCategory("媒體轉帳", "台新卡費許廷煥")).toBe("卡費");
    expect(autoFamilyCategory("轉帳存入", "轉出288818****2142")).toBe(
      "內部轉帳",
    );
    expect(autoFamilyCategory("存款息", "")).toBe("利息");
    expect(autoFamilyCategory("CD轉出", "**8604 廷煥昱臻房租")).toBe("房租");
    expect(autoFamilyCategory("CD轉入", "148 生活費")).toBe("生活費");
    expect(autoFamilyCategory("CD轉出", "**8722 許欣予７６５１")).toBe("教育");
    expect(autoFamilyCategory("CD轉出", "完全看不出來的備註")).toBe("未分類");
  });
});

describe("familyCardCategory 信用卡明細", () => {
  it("消費依關鍵字映射進家庭分類", () => {
    expect(familyCardCategory("連加＊連加＊統一超商TAIPEI", 25)).toBe("飲食");
    expect(familyCardCategory("ＣＯＵＰＡＮＧTAIPEI", 300)).toBe("日用");
    expect(familyCardCategory("嘟嘟房台北車站站", 60)).toBe("交通");
    expect(familyCardCategory("欣泰瓦斯費", 850)).toBe("水電瓦斯");
    expect(familyCardCategory("連加＊連加＊ＸｐａｒｋTAIPEI", 190)).toBe("娛樂");
    expect(familyCardCategory("連加＊連加＊兒童新樂園TAIPEI", 221)).toBe("娛樂");
    expect(familyCardCategory("小人國主題樂園", 1500)).toBe("娛樂");
    expect(familyCardCategory("力行國際貿易有限公司New Ta", 90)).toBe("娛樂");
    expect(familyCardCategory("連加＊連加＊萊爾富TAIPEI", 59)).toBe("飲食");
    expect(familyCardCategory("連加＊８５˚Ｃ五股成泰Taipei", 120)).toBe("飲食");
    expect(familyCardCategory("連加＊連加＊八方雲集TAIPEI", 90)).toBe("飲食");
    expect(
      familyCardCategory("連加＊LINEPAY*WU GU QU GONGTAIPEI", 10),
    ).toBe("飲食");
    expect(
      familyCardCategory("悠遊卡自動加值－台北捷運台北捷運 /TW", 500),
    ).toBe("交通");
  });

  it("繳款歸卡費，一般退款依店家分類（負數淨掉）", () => {
    expect(
      familyCardCategory("台新銀行帳戶自動轉帳扣繳台新信用 卡款", -65785),
    ).toBe("卡費");
    expect(familyCardCategory("ＣＯＵＰＡＮＧTAIPEI", -59)).toBe("日用");
  });

  it("無法判斷時回傳未分類", () => {
    expect(familyCardCategory("連加＊連加＊聚珍臺灣TAIPEI", 301)).toBe(
      "未分類",
    );
  });
});
