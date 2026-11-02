import { describe, expect, it } from "vitest";
import { isSamePayee, payeeTokens } from "./backfill-family-rent-2026";

const template = {
  description: "CD轉出",
  note: "數位跨行807-00133018** **8604 王小明 房租",
};

describe("payeeTokens", () => {
  it("取出收款帳號特徵", () => {
    expect(payeeTokens(`${template.description} ${template.note}`)).toEqual([
      "807-00133018**",
      "**8604",
    ]);
  });
});

describe("isSamePayee", () => {
  it("同帳號但備註沒寫房租仍視為同收款人", () => {
    expect(
      isSamePayee(
        { description: "CD轉出", note: "數位跨行807-00133018** **8604 王小明" },
        template,
      ),
    ).toBe(true);
  });

  it("不同帳號不算", () => {
    expect(
      isSamePayee(
        { description: "CD轉出", note: "數位跨行812-00999999** **1234 某人" },
        template,
      ),
    ).toBe(false);
  });

  it("範本沒有帳號特徵時須摘要＋備註完全相同", () => {
    const plain = { description: "轉帳", note: "房租" };
    expect(isSamePayee({ description: "轉帳", note: "房租" }, plain)).toBe(true);
    expect(isSamePayee({ description: "轉帳", note: null }, plain)).toBe(false);
  });
});
