import { describe, expect, it } from "vitest";
import {
  addDays,
  estimateDailyKm,
  groupVisits,
  type MaintenanceStatus,
  predictDueDate,
  sortByUrgency,
  urgencyOf,
  usedRatio,
} from "./maintenance";

function status(over: Partial<MaintenanceStatus>): MaintenanceStatus {
  return {
    key: "k",
    name: "n",
    group: "routine",
    note: "",
    inspectOnly: false,
    km: null,
    months: null,
    lastDate: null,
    lastMileage: null,
    dueMileage: null,
    dueDate: null,
    kmRemaining: null,
    daysRemaining: null,
    dueByKm: false,
    dueByTime: false,
    due: false,
    ...over,
  };
}

describe("urgencyOf", () => {
  it("到期、快到了、正常", () => {
    expect(urgencyOf(status({ due: true }))).toBe("due");
    expect(urgencyOf(status({ kmRemaining: 500 }))).toBe("soon");
    expect(urgencyOf(status({ daysRemaining: 30 }))).toBe("soon");
    expect(urgencyOf(status({ kmRemaining: 501, daysRemaining: 31 }))).toBe("ok");
  });
});

describe("usedRatio", () => {
  it("里程與時間取較高者，不低於 0", () => {
    expect(usedRatio(status({ km: 2000, kmRemaining: 500 }))).toBeCloseTo(0.75);
    expect(
      usedRatio(status({ km: 2000, kmRemaining: 1500, months: 12, daysRemaining: 0 })),
    ).toBeCloseTo(1);
    expect(usedRatio(status({ km: 2000, kmRemaining: 3000 }))).toBe(0);
    expect(usedRatio(status({}))).toBeNull();
  });
});

describe("estimateDailyKm", () => {
  it("用近一年最早與最晚的觀測點", () => {
    expect(
      estimateDailyKm(
        [
          { date: "2024-01-01", mileage: 0 },
          { date: "2026-01-01", mileage: 1000 },
          { date: "2026-03-02", mileage: 1600 },
        ],
        "2026-06-01",
      ),
    ).toBeCloseTo(10);
  });

  it("跨度太短或里程沒增加回傳 null", () => {
    expect(
      estimateDailyKm(
        [
          { date: "2026-01-01", mileage: 0 },
          { date: "2026-01-05", mileage: 100 },
        ],
        "2026-01-10",
      ),
    ).toBeNull();
    expect(estimateDailyKm([{ date: "2026-01-01", mileage: 0 }], "2026-02-01")).toBeNull();
  });
});

describe("predictDueDate", () => {
  it("里程推估日與時間到期日取較早者", () => {
    const s = status({ kmRemaining: 300, dueDate: "2026-12-31" });
    expect(predictDueDate(s, 10, "2026-11-01")).toBe("2026-12-01");
    expect(predictDueDate(s, null, "2026-11-01")).toBe("2026-12-31");
    expect(predictDueDate(status({ due: true }), 10, "2026-11-01")).toBeNull();
  });
});

describe("addDays / sortByUrgency / groupVisits", () => {
  it("addDays 跨月", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("到期在前，同級內已用比例高者在前", () => {
    const list = [
      status({ key: "ok", km: 1000, kmRemaining: 900 }),
      status({ key: "due", due: true }),
      status({ key: "ok2", km: 1000, kmRemaining: 600 }),
      status({ key: "soon", kmRemaining: 100 }),
    ];
    expect(sortByUrgency(list).map((s) => s.key)).toEqual(["due", "soon", "ok2", "ok"]);
  });

  it("同日同里程合成一次進廠並加總花費", () => {
    const visits = groupVisits([
      { id: 1, date: "2026-11-01", mileage: 5000, cost: 800 },
      { id: 2, date: "2026-11-01", mileage: 5000, cost: null },
      { id: 3, date: "2026-09-01", mileage: 3000, cost: null },
    ]);
    expect(visits).toHaveLength(2);
    expect(visits[0].cost).toBe(800);
    expect(visits[0].records.map((r) => r.id)).toEqual([1, 2]);
    expect(visits[1].cost).toBeNull();
  });
});
