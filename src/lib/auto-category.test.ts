import { describe, expect, it } from "vitest";
import { autoCategory } from "./auto-category";

describe("autoCategory", () => {
  it("加油站、停車場歸交通", () => {
    expect(
      autoCategory("台灣中油股份有限公司油品行銷事業部台北營業處西湖加油站", [
        "【113F 12092005】９２無鉛汽油",
      ]),
    ).toBe("交通");
    expect(
      autoCategory("千斗開發有限公司台64橋下停車場營業所", []),
    ).toBe("交通");
  });

  it("YouTube 歸訂閱", () => {
    expect(autoCategory("Google Asia Pacific Pte Ltd", ["YouTube"])).toBe(
      "訂閱",
    );
  });

  it("速食、超商食品、含『餐飲』店名歸飲食", () => {
    expect(
      autoCategory("和德昌股份有限公司台北瑞光分公司", [
        "餐-勁辣雞腿",
        "可樂-中",
      ]),
    ).toBe("飲食");
    expect(
      autoCategory("統一超商股份有限公司台北市第五０三分公司", [
        "美式冰咖啡(大)",
      ]),
    ).toBe("飲食");
    expect(
      autoCategory("薩摩亞商客來喜餐飲股份有限公司台灣分公司捷運雙連門市", [
        "桂圓紫米葡萄",
      ]),
    ).toBe("飲食");
  });

  it("杏一買咖啡看品項歸飲食，不被店名的『醫療』帶走", () => {
    expect(
      autoCategory("杏一醫療用品股份有限公司新光商場販售部", [
        "UCC艾洛瑪拿鐵PET500",
        "咖啡",
      ]),
    ).toBe("飲食");
  });

  it("藥局歸醫療", () => {
    expect(autoCategory("大樹藥局股份有限公司", ["感冒藥"])).toBe("醫療");
  });

  it("門票歸娛樂、交易處理費歸其他", () => {
    expect(
      autoCategory("螞蟻帝國企業有限公司", ["博物館門票-全票"]),
    ).toBe("娛樂");
    expect(autoCategory("幣託科技股份有限公司", ["交易處理費"])).toBe("其他");
  });

  it("無法判斷時回傳未分類", () => {
    expect(autoCategory("統一數網股份有限公司", ["運費-5/18-5/20"])).toBe(
      "未分類",
    );
  });
});
