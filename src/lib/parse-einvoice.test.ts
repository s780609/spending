import { describe, expect, it } from "vitest";
import { parseEInvoiceCsv } from "./parse-einvoice";

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
