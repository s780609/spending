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

  it("保險公司歸保險", () => {
    expect(autoCategory("國泰人壽保險股份有限公司", ["保費"])).toBe("保險");
  });

  it("百貨公司買玩具歸娛樂", () => {
    expect(
      autoCategory("遠東百貨股份有限公司信義分公司", ["綜合玩具"]),
    ).toBe("娛樂");
  });

  it("電玩遊戲歸娛樂", () => {
    expect(
      autoCategory("網路家庭國際資訊股份有限公司", [
        "PS5 最終幻想7 FINAL FANTASY VII 重生中文版 送隨機鑰匙圈",
      ]),
    ).toBe("娛樂");
  });

  it("門票歸娛樂、交易處理費歸其他", () => {
    expect(
      autoCategory("螞蟻帝國企業有限公司", ["博物館門票-全票"]),
    ).toBe("娛樂");
    expect(autoCategory("幣託科技股份有限公司", ["交易處理費"])).toBe("其他");
  });

  it("百貨公司買服飾，店名看不出來就看品項歸日用", () => {
    expect(
      autoCategory("新光三越百貨股份有限公司台北信義分公司", [
        "休閒服飾用品Casuals",
        "已開發票券類金額",
      ]),
    ).toBe("日用");
  });

  it("常見長尾案例", () => {
    expect(autoCategory("GitHub, Inc.", ["GitHub Action - Linux 2 Core Advanced Usage"])).toBe("訂閱");
    expect(autoCategory("將捷文創實業股份有限公司", ["ParkingFee"])).toBe("交通");
    expect(autoCategory("清富開發企業有限公司瑞芳分公司", ["92無鉛"])).toBe("交通");
    expect(autoCategory("盛豐行股份有限公司大直分公司", ["水芭蕉 蛇年限定 純米大吟釀 720ML"])).toBe("飲食");
    expect(autoCategory("悠旅生活事業股份有限公司洲子門市部", ["夜幕星冰樂中"])).toBe("飲食");
    expect(autoCategory("幼信有限公司", ["普拿疼止痛加強錠20錠"])).toBe("醫療");
    expect(autoCategory("統一數網股份有限公司", ["運費-5/18-5/20"])).toBe("其他");
    expect(autoCategory("宜家家居股份有限公司觀音營業所", ["RODALM frame 50x70 walnut effect AP"])).toBe("日用");
    expect(autoCategory("Home Box Office (Singapore) Pte Ltd.", ["HBO Max 標準"])).toBe("訂閱");
    expect(autoCategory("誠品生活股份有限公司", ["失控的焦慮世代"])).toBe("娛樂");
  });

  it("信用卡帳單店名（含全形英文）按常理分類", () => {
    expect(autoCategory("連加＊連加＊統一超商TAIPEI", [])).toBe("飲食");
    expect(autoCategory("連加＊連加＊麥當勞TAIPEI", [])).toBe("飲食");
    expect(autoCategory("ＣＯＵＰＡＮＧTAIPEI", [])).toBe("日用");
    expect(autoCategory("連加＊連加＊Ｋｌｏｏｋ 客路 TAIPEI", [])).toBe("娛樂");
    expect(autoCategory("Booking.com HotelO7112 Amster", [])).toBe("娛樂");
    expect(autoCategory("連加＊連加＊ＰＯＹＡ寶雅TAIPEI", [])).toBe("日用");
    expect(autoCategory("連加＊本華壽司Taipei", [])).toBe("飲食");
    expect(autoCategory("連加＊菁菁水果鋪（五股Taipei", [])).toBe("飲食");
    expect(autoCategory("宜得利家居 第04/06期 /TW", [])).toBe("日用");
    expect(autoCategory("連加＊ｍｏｍｏ購物網Taipei", [])).toBe("日用");
    expect(autoCategory("酷澎ＷＯＷ會員訂閱服務月費TAIPEI", [])).toBe("訂閱");
    expect(autoCategory("連加＊連加＊鶴茶樓－ 鶴頂紅 TAIPEI", [])).toBe("飲食");
    expect(autoCategory("連加＊卡多摩嬰童館Taipei", [])).toBe("日用");
    expect(autoCategory("嘟嘟房台北車站站", [])).toBe("交通");
  });

  it("全聯一律歸日用，優先於品項的飲食關鍵字", () => {
    expect(autoCategory("全支付－全聯福利中心TAIPEI", [])).toBe("日用");
    expect(
      autoCategory("全聯實業股份有限公司五股工商分公司", ["光泉木瓜牛乳"]),
    ).toBe("日用");
  });

  it("無法判斷時回傳未分類", () => {
    expect(autoCategory("東森得易購股份有限公司", ["應稅商品"])).toBe(
      "未分類",
    );
  });
});
