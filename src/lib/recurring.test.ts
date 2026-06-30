import { describe, expect, it } from "vitest";
import { dueDates, initialLastGenerated } from "./recurring";

describe("dueDates", () => {
  it("到期日還沒到時不產生", () => {
    expect(dueDates(25, "2026-05", "2026-06-11")).toEqual([]);
  });

  it("到期日當天產生", () => {
    expect(dueDates(25, "2026-05", "2026-06-25")).toEqual(["2026-06-25"]);
  });

  it("久未開站會補齊中間每個月", () => {
    expect(dueDates(25, "2026-03", "2026-06-11")).toEqual([
      "2026-04-25",
      "2026-05-25",
    ]);
  });

  it("設 31 號遇到短月份取月底", () => {
    expect(dueDates(31, "2026-01", "2026-03-05")).toEqual(["2026-02-28"]);
  });

  it("已產生到當月時不重複", () => {
    expect(dueDates(25, "2026-06", "2026-06-30")).toEqual([]);
  });
});

describe("dueDates 到期期限", () => {
  it("超過到期月份不再產生（含當月）", () => {
    expect(dueDates(25, "2026-03", "2026-06-30", "2026-04")).toEqual([
      "2026-04-25",
    ]);
  });

  it("到期月份等於產生月份時仍產生", () => {
    expect(dueDates(25, "2026-04", "2026-05-31", "2026-05")).toEqual([
      "2026-05-25",
    ]);
  });

  it("已過期的規則不產生任何日期", () => {
    expect(dueDates(25, "2026-03", "2026-06-30", "2026-02")).toEqual([]);
  });

  it("未設期限時行為不變", () => {
    expect(dueDates(25, "2026-04", "2026-06-30", null)).toEqual([
      "2026-05-25",
      "2026-06-25",
    ]);
  });
});

describe("initialLastGenerated", () => {
  it("本月到期日尚未到，從本月開始產生", () => {
    // 6/25 還沒到 → 標記為上個月已產生，6/25 當天會補
    expect(initialLastGenerated(25, "2026-06-11")).toBe("2026-05");
  });

  it("本月到期日已過，從下個月開始產生", () => {
    expect(initialLastGenerated(5, "2026-06-11")).toBe("2026-06");
  });

  it("今天就是到期日，今天立即產生", () => {
    expect(initialLastGenerated(11, "2026-06-11")).toBe("2026-05");
  });
});

describe("dueDates 每年", () => {
  it("每年到期日當天產生", () => {
    expect(dueDates(15, "2026-02", "2026-03-15", null, "yearly", 3)).toEqual([
      "2026-03-15",
    ]);
  });

  it("每年到期日還沒到時不產生", () => {
    expect(dueDates(15, "2026-02", "2026-03-10", null, "yearly", 3)).toEqual([]);
  });

  it("非當年度月份不產生", () => {
    // monthOfYear=3，今天 6 月：6 月不是 3 月 → 不產生
    expect(dueDates(15, "2026-03", "2026-06-30", null, "yearly", 3)).toEqual([]);
  });

  it("久未開站跨年補齊，每年一筆", () => {
    expect(dueDates(15, "2024-02", "2026-06-30", null, "yearly", 3)).toEqual([
      "2024-03-15",
      "2025-03-15",
      "2026-03-15",
    ]);
  });

  it("超過到期月份不再產生", () => {
    expect(
      dueDates(15, "2024-02", "2026-06-30", "2025-03", "yearly", 3),
    ).toEqual(["2024-03-15", "2025-03-15"]);
  });

  it("每年遇短月份取月底（2 月 31 號 → 2/28）", () => {
    expect(dueDates(31, "2026-01", "2026-12-31", null, "yearly", 2)).toEqual([
      "2026-02-28",
    ]);
  });
});

describe("initialLastGenerated 每年", () => {
  it("今年到期日尚未到，標記到期月前一月（當年仍會補）", () => {
    // 今天 6 月、每年 12 月 → 12 月那天才補，種子設 2026-11
    expect(initialLastGenerated(15, "2026-06-30", "yearly", 12)).toBe(
      "2026-11",
    );
  });

  it("今年到期日已過，標記到期月（明年才補）", () => {
    expect(initialLastGenerated(15, "2026-06-30", "yearly", 3)).toBe("2026-03");
  });

  it("今年到期日就是今天，今天立即產生", () => {
    expect(initialLastGenerated(30, "2026-06-30", "yearly", 6)).toBe("2026-05");
  });
});
