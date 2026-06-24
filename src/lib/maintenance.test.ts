import { describe, expect, it } from "vitest";
import {
  addMonths,
  computeMaintenanceStatus,
  diffDays,
  type MaintenanceItem,
} from "./maintenance";

describe("addMonths", () => {
  it("一般情況逐月遞增", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
  });

  it("日數超過目標月底時夾到月底", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("diffDays", () => {
  it("計算兩日期相差天數（a - b）", () => {
    expect(diffDays("2026-06-24", "2026-06-20")).toBe(4);
    expect(diffDays("2026-06-20", "2026-06-24")).toBe(-4);
    expect(diffDays("2026-06-24", "2026-06-24")).toBe(0);
  });
});

const KM_ITEM: MaintenanceItem = {
  key: "air_filter",
  name: "空濾",
  km: 3000,
  group: "routine",
  note: "",
};
const TIME_ITEM: MaintenanceItem = {
  key: "battery",
  name: "電瓶",
  months: 12,
  group: "routine",
  note: "",
};
const BOTH_ITEM: MaintenanceItem = {
  key: "brake_fluid",
  name: "煞車油",
  km: 12000,
  months: 12,
  group: "routine",
  note: "",
};

describe("computeMaintenanceStatus", () => {
  it("里程已超過間隔 → 里程到期", () => {
    const [s] = computeMaintenanceStatus(
      [KM_ITEM],
      new Map([["air_filter", { date: "2026-01-01", mileage: 6000 }]]),
      9500, // 6000 + 3000 = 9000，已超過
      "2026-06-24",
      null,
    );
    expect(s.dueMileage).toBe(9000);
    expect(s.kmRemaining).toBe(-500);
    expect(s.dueByKm).toBe(true);
    expect(s.due).toBe(true);
  });

  it("里程未到 → 不到期", () => {
    const [s] = computeMaintenanceStatus(
      [KM_ITEM],
      new Map([["air_filter", { date: "2026-01-01", mileage: 6000 }]]),
      8000,
      "2026-06-24",
      null,
    );
    expect(s.kmRemaining).toBe(1000);
    expect(s.due).toBe(false);
  });

  it("時間制：超過年限 → 時間到期（即使沒里程資料）", () => {
    const [s] = computeMaintenanceStatus(
      [TIME_ITEM],
      new Map([["battery", { date: "2025-01-01", mileage: 0 }]]),
      0,
      "2026-06-24", // 距 2026-01-01 已超過
      null,
    );
    expect(s.dueDate).toBe("2026-01-01");
    expect(s.daysRemaining).toBeLessThan(0);
    expect(s.dueByTime).toBe(true);
    expect(s.dueByKm).toBe(false);
    expect(s.due).toBe(true);
  });

  it("里程或時間先到為準：里程未到但時間已到 → 到期", () => {
    const [s] = computeMaintenanceStatus(
      [BOTH_ITEM],
      new Map([["brake_fluid", { date: "2025-01-01", mileage: 1000 }]]),
      2000, // 距里程到期還很遠（1000 + 12000 = 13000）
      "2026-06-24", // 但已超過 1 年
      null,
    );
    expect(s.dueByKm).toBe(false);
    expect(s.dueByTime).toBe(true);
    expect(s.due).toBe(true);
  });

  it("尚未紀錄過：里程制以 0 起算，時間制以 startDate 起算", () => {
    const [s] = computeMaintenanceStatus(
      [BOTH_ITEM],
      new Map(),
      13000, // >= 0 + 12000 → 里程到期
      "2026-06-24",
      "2026-06-01", // startDate 才一週，時間未到
    );
    expect(s.lastDate).toBeNull();
    expect(s.dueMileage).toBe(12000);
    expect(s.dueByKm).toBe(true);
    expect(s.dueDate).toBe("2027-06-01");
    expect(s.dueByTime).toBe(false);
    expect(s.due).toBe(true);
  });

  it("時間制但無上次紀錄也無 startDate → 不判斷時間（dueDate 為 null）", () => {
    const [s] = computeMaintenanceStatus(
      [TIME_ITEM],
      new Map(),
      0,
      "2026-06-24",
      null,
    );
    expect(s.dueDate).toBeNull();
    expect(s.daysRemaining).toBeNull();
    expect(s.dueByTime).toBe(false);
    expect(s.due).toBe(false);
  });

  it("帶 inspectOnly 的項目會原樣傳遞", () => {
    const [s] = computeMaintenanceStatus(
      [{ ...KM_ITEM, inspectOnly: true }],
      new Map(),
      0,
      "2026-06-24",
      null,
    );
    expect(s.inspectOnly).toBe(true);
  });
});
