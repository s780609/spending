import { describe, expect, it } from "vitest";
import {
  detectStatementType,
  parseBankStatement,
  parseCardStatement,
  type PdfItem,
} from "./parse-taishin";

function item(text: string, x: number, y: number, width = 30): PdfItem {
  return { text, x, y, width };
}

describe("parseBankStatement 台新綜合對帳單", () => {
  const page1: PdfItem[] = [
    item("台新銀行綜合對帳單", 100, 800),
    item("資料期間：2026/03/01~2026/03/31", 100, 780),
    item("Richart總資產", 80, 700),
    item("$259,283", 200, 700),
  ];
  // 欄位 x 座標：支出金額 ~300、存入金額 ~360、帳戶餘額 ~420
  const page2: PdfItem[] = [
    item("帳號", 40, 700),
    item("日期", 110, 700),
    item("摘要", 170, 700),
    item("支出金額", 300, 700, 40),
    item("存入金額", 360, 700, 40),
    item("帳戶餘額", 420, 700, 40),
    item("備註", 480, 700),
    // 支出列（金額落在支出欄），備註同行
    item("288810****6516", 40, 680),
    item("2026/03/02", 110, 680),
    item("媒體轉出", 170, 680),
    item("$361", 305, 680),
    item("$180,221", 420, 680),
    item("台電電費05605130200", 480, 680),
    // 存入列（金額落在存入欄），備註跨行（上下緊鄰）
    item("ATM 803-00008885****1", 480, 668),
    item("288810****6516", 40, 660),
    item("2026/03/03", 110, 660),
    item("CD轉入", 170, 660),
    item("$11,200", 365, 660),
    item("$114,779", 420, 660),
    item("148 阿公贊助", 480, 652),
    // 距離很遠的雜訊行，不應被歸戶
    item("註：以下為免責聲明", 40, 400),
  ];

  it("解析期間、總資產與交易（支出/存入靠欄位位置判斷）", () => {
    const result = parseBankStatement([page1, page2]);

    expect(result.month).toBe("2026-03");
    expect(result.totalBalance).toBe(259283);
    expect(result.transactions).toHaveLength(2);

    const [first, second] = result.transactions;
    expect(first).toMatchObject({
      account: "288810****6516",
      date: "2026-03-02",
      description: "媒體轉出",
      withdrawal: 361,
      deposit: null,
      balance: 180221,
    });
    expect(first.note).toContain("台電電費");

    expect(second).toMatchObject({
      date: "2026-03-03",
      description: "CD轉入",
      withdrawal: null,
      deposit: 11200,
      balance: 114779,
    });
    expect(second.note).toContain("ATM 803");
    expect(second.note).toContain("阿公贊助");
    expect(second.note).not.toContain("免責");
  });
});

describe("parseBankStatement 餘額與備註黏在同一片段", () => {
  it("拆開後仍正確判斷支出與餘額", () => {
    const page: PdfItem[] = [
      item("資料期間：2026/03/01~2026/03/31", 100, 780),
      item("支出金額", 300, 700, 40),
      item("存入金額", 360, 700, 40),
      item("帳戶餘額", 420, 700, 40),
      item("288810****6516", 40, 680),
      item("2026/03/02", 110, 680),
      item("媒體轉出", 170, 680),
      item("$361", 305, 680, 20),
      item("$180,221 台電電費05605130200", 420, 680, 120),
    ];
    const result = parseBankStatement([page]);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      withdrawal: 361,
      deposit: null,
      balance: 180221,
    });
    expect(result.transactions[0].note).toContain("台電電費");
  });
});

describe("parseCardStatement 台新信用卡帳單", () => {
  const page1: PdfItem[] = [
    item("115年 05月 信用卡電子帳單", 100, 800),
    item("+本期新增款項", 80, 700),
    item("94,373", 200, 700),
    item("=本期累計應繳金額", 80, 680),
    item("94,373", 200, 680),
  ];
  const page2: PdfItem[] = [
    item("Richart卡(原@GoGo悠遊御璽) (卡號末四碼:6604)", 60, 700),
    // 一般消費
    item("115/04/05", 40, 680),
    item("115/04/09", 110, 680),
    item("ＣＯＵＰＡＮＧTAIPEI", 180, 680),
    item("300", 350, 680),
    item("TW", 420, 680),
    // 店名跨行（上下緊鄰主列）
    item("ＴＳ＊Ｒｉｃｈａｒｔ Ｍａｒｔ", 180, 668),
    item("115/04/09", 40, 660),
    item("115/04/10", 110, 660),
    item("66", 350, 660),
    item("TW", 420, 660),
    item("TAIPEI", 180, 652),
    // 繳款（負數、摘要跨行）
    item("台新銀行帳戶自動轉帳扣繳台新信用", 180, 628),
    item("115/04/22", 40, 620),
    item("115/04/22", 110, 620),
    item("-65,785", 350, 620),
    item("卡款", 180, 612),
    // 外幣交易
    item("115/04/24", 40, 600),
    item("115/04/28", 110, 600),
    item("Booking.com HotelO7112 Amster", 180, 600),
    item("19,182", 350, 600),
    item("0424", 400, 600),
    item("NL", 430, 600),
    item("JPY", 450, 600),
    item("96,876.00", 470, 600),
    // 第二張卡
    item("Richart卡(原@GoGo悠遊御璽) (卡號末四碼:6612)", 60, 580),
    item("115/04/02", 40, 560),
    item("115/04/09", 110, 560),
    item("連加＊Ｋ區東森廣場Taipei", 180, 560),
    item("43", 350, 560),
    item("TW", 420, 560),
  ];

  it("解析月份、本期金額與消費明細（民國年轉西元）", () => {
    const result = parseCardStatement([page1, page2]);

    expect(result.month).toBe("2026-05");
    expect(result.newCharges).toBe(94373);
    expect(result.totalDue).toBe(94373);
    expect(result.transactions).toHaveLength(5);

    const [coupang, mart, payment, booking, second] = result.transactions;
    expect(coupang).toMatchObject({
      purchaseDate: "2026-04-05",
      postDate: "2026-04-09",
      description: "ＣＯＵＰＡＮＧTAIPEI",
      amount: 300,
      cardLast4: "6604",
    });
    expect(mart.amount).toBe(66);
    expect(mart.description).toContain("Ｒｉｃｈａｒｔ");
    expect(payment.amount).toBe(-65785);
    expect(payment.description).toContain("自動轉帳扣繳");
    expect(booking.amount).toBe(19182);
    expect(booking.note).toContain("JPY");
    expect(second.cardLast4).toBe("6612");
  });
});

describe("detectStatementType", () => {
  it("依內文判斷帳單種類", () => {
    expect(
      detectStatementType([[item("台新銀行綜合對帳單", 0, 0)]]),
    ).toBe("bank");
    expect(
      detectStatementType([[item("115年 05月 信用卡電子帳單", 0, 0)]]),
    ).toBe("card");
    expect(detectStatementType([[item("亂七八糟", 0, 0)]])).toBe(null);
  });
});
