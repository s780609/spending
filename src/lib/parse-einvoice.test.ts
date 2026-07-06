import { describe, expect, it } from "vitest";
import {
  parseEInvoiceCsv,
  parseEInvoiceDownloadCsv,
  parseInvoiceCsv,
} from "./parse-einvoice";

const SAMPLE = [
  "表頭=M|載具名稱|載具號碼|發票日期|商店統編|商店店名|發票號碼|總金額|發票狀態|",
  "明細=D|發票號碼|小計|品項名稱|",
  "M|手機條碼|/5Z9M.KQ|20260506|73905876|台灣中油加油站|AQ98143668|161|開立|",
  "D|AQ98143668|165|【113F 12092005】９２無鉛汽油|",
  "D|AQ98143668|-4|【9030192001】92無鉛汽油折抵額|",
  "M|跨境電商電子郵件載具|s780609@gmail.com|20260505|42523557|Google Asia Pacific Pte Ltd|AD23832103|30|開立|",
  "D|AD23832103|29|YouTube|",
].join("\r\n");

describe("parseEInvoiceCsv", () => {
  it("解析 M 列為發票、D 列為品項明細", () => {
    const result = parseEInvoiceCsv(SAMPLE);

    expect(result.invoices).toHaveLength(2);

    const [first, second] = result.invoices;
    expect(first).toMatchObject({
      carrierName: "手機條碼",
      carrierNumber: "/5Z9M.KQ",
      date: "2026-05-06",
      sellerTaxId: "73905876",
      sellerName: "台灣中油加油站",
      invoiceNumber: "AQ98143668",
      totalAmount: 161,
      status: "開立",
    });
    expect(first.items).toEqual([
      { name: "【113F 12092005】９２無鉛汽油", amount: 165 },
      { name: "【9030192001】92無鉛汽油折抵額", amount: -4 },
    ]);

    expect(second.invoiceNumber).toBe("AD23832103");
    expect(second.date).toBe("2026-05-05");
    expect(second.items).toEqual([{ name: "YouTube", amount: 29 }]);
  });

  it("跳過作廢發票並計數", () => {
    const csv = [
      "M|手機條碼|/5Z9M.KQ|20260501|11111111|某商店|AA11111111|100|作廢|",
      "D|AA11111111|100|商品A|",
      "M|手機條碼|/5Z9M.KQ|20260502|22222222|另一商店|BB22222222|50|開立|",
      "D|BB22222222|50|商品B|",
    ].join("\r\n");

    const result = parseEInvoiceCsv(csv);

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].invoiceNumber).toBe("BB22222222");
    expect(result.voidedCount).toBe(1);
  });

  it("容忍 BOM、LF 換行與空白列", () => {
    const csv =
      "﻿M|手機條碼|/X|20260101|33333333|店名|CC33333333|10|開立|\n\nD|CC33333333|10|品項|\n";

    const result = parseEInvoiceCsv(csv);

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].date).toBe("2026-01-01");
    expect(result.invoices[0].items).toEqual([{ name: "品項", amount: 10 }]);
  });

  it("D 列依發票號碼歸戶，小計可含小數", () => {
    const csv = [
      "M|手機條碼|/X|20260101|44444444|咖啡店|DD44444444|97|開立|",
      "D|DD44444444|42.00|拿鐵熱咖啡(中)|",
      "D|DD44444444|55.00|拿鐵冰咖啡(大)|",
    ].join("\r\n");

    const result = parseEInvoiceCsv(csv);

    expect(result.invoices[0].items).toEqual([
      { name: "拿鐵熱咖啡(中)", amount: 42 },
      { name: "拿鐵冰咖啡(大)", amount: 55 },
    ]);
  });

  it("空內容回傳空結果", () => {
    const result = parseEInvoiceCsv("");

    expect(result.invoices).toEqual([]);
    expect(result.voidedCount).toBe(0);
  });

  it("品項名稱內含換行時，後續行併回同一筆品項", () => {
    const csv = [
      "M|手機條碼|/X|20260524|60260052|千斗開發有限公司台64橋下停車場營業所|BR07497744|100|開立|",
      "D|BR07497744|100|進場時間:2026/05/24 17:25:22",
      "繳費時間:2026/05/24 22:25:06",
      "臨停費率金額:100",
      "停車費|",
      "M|手機條碼|/X|20260525|16099582|下一家店|AX84651575|147|開立|",
      "D|AX84651575|147|正常品項|",
    ].join("\r\n");

    const result = parseEInvoiceCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.invoices).toHaveLength(2);
    expect(result.invoices[0].items).toEqual([
      {
        name: "進場時間:2026/05/24 17:25:22 繳費時間:2026/05/24 22:25:06 臨停費率金額:100 停車費",
        amount: 100,
      },
    ]);
    expect(result.invoices[1].items).toEqual([
      { name: "正常品項", amount: 147 },
    ]);
  });

  it("無法解析的列收進 errors 而不中斷", () => {
    const csv = [
      "M|手機條碼|/X|20260101|55555555|店名|EE55555555|10|開立|",
      "X|不認識的列|",
      "M|缺欄位|",
    ].join("\r\n");

    const result = parseEInvoiceCsv(csv);

    expect(result.invoices).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
  });
});

// 官網下載的「雲端發票明細」CSV：逗號分隔、含中文標題列，
// 每一列同時是發票主檔＋一筆品項，同號碼多列，整張金額為品項加總。
const DOWNLOAD_SAMPLE = [
  "載具自訂名稱,發票日期,發票號碼,發票金額,發票狀態,折讓,賣方統一編號,賣方名稱,賣方地址,買方統編,消費明細_數量,消費明細_單價,消費明細_金額,消費明細_品名",
  "手機條碼,20260705,CY46407679,45,開立已確認,否,27947182,統一超商股份有限公司台北縣第七六三分公司,新北市五股區成泰路二段81號,,1,45,45,美式冰咖啡(大)",
  "手機條碼,20260705,CY22484161,70,開立已確認,否,00509071,統一超商股份有限公司台北市第四十五門市,台北市中正區忠孝西路一段47號B1(櫃號KB111),,2,35,70,雪碧汽水檸檬茶風味PET600",
  "手機條碼,20260705,CY22484161,-21,開立已確認,否,00509071,統一超商股份有限公司台北市第四十五門市,台北市中正區忠孝西路一段47號B1(櫃號KB111),,1,-21,-21,雪碧檸檬茶單27元兩件49元*2AJT*",
  "手機條碼,20260703,DP33705351,60,開立已確認,否,88153830,軒禾茗飲商行,台北市內湖區內湖路一段623號一樓,,1,60,60,紅茶拿鐵(L)-7分冰,半糖",
  "捐贈或作廢之發票，字軌號碼均會隱末3碼",
  "注意：本功能所下載之雲端發票明細檔案可能因賣方營業人後續作廢或折讓等原因而產生誤差。",
].join("\r\n");

describe("parseEInvoiceDownloadCsv", () => {
  it("每列一品項、同號碼歸戶，整張金額為品項加總", () => {
    const result = parseEInvoiceDownloadCsv(DOWNLOAD_SAMPLE);

    // 3 張發票（CY46407679 / CY22484161 / DP33705351）
    expect(result.invoices).toHaveLength(3);

    const single = result.invoices.find(
      (i) => i.invoiceNumber === "CY46407679",
    )!;
    expect(single).toMatchObject({
      carrierName: "手機條碼",
      date: "2026-07-05",
      sellerTaxId: "27947182",
      sellerName: "統一超商股份有限公司台北縣第七六三分公司",
      totalAmount: 45,
      status: "開立已確認",
    });
    expect(single.items).toEqual([{ name: "美式冰咖啡(大)", amount: 45 }]);

    // 多品項含負數折抵：70 + (-21) = 49
    const multi = result.invoices.find(
      (i) => i.invoiceNumber === "CY22484161",
    )!;
    expect(multi.totalAmount).toBe(49);
    expect(multi.items).toEqual([
      { name: "雪碧汽水檸檬茶風味PET600", amount: 70 },
      { name: "雪碧檸檬茶單27元兩件49元*2AJT*", amount: -21 },
    ]);
  });

  it("品名內含逗號（未加引號）時，逗號後的字仍併回品名", () => {
    const result = parseEInvoiceDownloadCsv(DOWNLOAD_SAMPLE);

    const tea = result.invoices.find((i) => i.invoiceNumber === "DP33705351")!;
    expect(tea.items).toEqual([
      { name: "紅茶拿鐵(L)-7分冰,半糖", amount: 60 },
    ]);
    expect(tea.totalAmount).toBe(60);
  });

  it("忽略標題列與檔尾說明文字，不計入 errors", () => {
    const result = parseEInvoiceDownloadCsv(DOWNLOAD_SAMPLE);
    expect(result.errors).toEqual([]);
  });

  it("跳過作廢發票並計數", () => {
    const csv = [
      "載具自訂名稱,發票日期,發票號碼,發票金額,發票狀態,折讓,賣方統一編號,賣方名稱,賣方地址,買方統編,消費明細_數量,消費明細_單價,消費明細_金額,消費明細_品名",
      "手機條碼,20260701,AA11111111,100,作廢,否,11111111,某商店,某地址,,1,100,100,商品A",
      "手機條碼,20260702,BB22222222,50,開立已確認,否,22222222,另一商店,另一地址,,1,50,50,商品B",
    ].join("\r\n");

    const result = parseEInvoiceDownloadCsv(csv);

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].invoiceNumber).toBe("BB22222222");
    expect(result.voidedCount).toBe(1);
  });

  it("容忍 BOM 與空白列", () => {
    const csv =
      "﻿載具自訂名稱,發票日期,發票號碼,發票金額,發票狀態,折讓,賣方統一編號,賣方名稱,賣方地址,買方統編,消費明細_數量,消費明細_單價,消費明細_金額,消費明細_品名\n\n手機條碼,20260101,CC33333333,10,開立已確認,否,33333333,店名,地址,,1,10,10,品項\n";

    const result = parseEInvoiceDownloadCsv(csv);

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].date).toBe("2026-01-01");
    expect(result.invoices[0].items).toEqual([{ name: "品項", amount: 10 }]);
  });
});

describe("parseInvoiceCsv 自動偵測格式", () => {
  it("逗號＋中文標題列 → 走下載格式解析", () => {
    const result = parseInvoiceCsv(DOWNLOAD_SAMPLE);
    expect(result.invoices).toHaveLength(3);
    expect(
      result.invoices.some((i) => i.invoiceNumber === "CY46407679"),
    ).toBe(true);
  });

  it("| 分隔 → 走每月寄送格式解析", () => {
    const csv = [
      "表頭=M|載具名稱|載具號碼|發票日期|商店統編|商店店名|發票號碼|總金額|發票狀態|",
      "明細=D|發票號碼|小計|品項名稱|",
      "M|手機條碼|/X|20260506|73905876|台灣中油加油站|AQ98143668|161|開立|",
      "D|AQ98143668|161|92無鉛汽油|",
    ].join("\r\n");

    const result = parseInvoiceCsv(csv);
    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].invoiceNumber).toBe("AQ98143668");
    expect(result.invoices[0].totalAmount).toBe(161);
  });
});
