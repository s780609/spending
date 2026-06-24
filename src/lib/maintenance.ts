export type MaintenanceGroup = "routine" | "major";

export interface MaintenanceItem {
  key: string;
  name: string;
  /** 里程間隔 km（無里程制為 undefined） */
  km?: number;
  /** 時間間隔（月，無時間制為 undefined） */
  months?: number;
  group: MaintenanceGroup;
  /** 重點提醒 */
  note: string;
  /** 純檢查/依磨耗項目：到期僅提醒「檢查」而非「更換」 */
  inspectOnly?: boolean;
}

/** 換機油的 key；其紀錄筆數 × kmPerOilChange 推算目前里程 */
export const ENGINE_OIL_KEY = "engine_oil";

/**
 * YAMAHA SMAX 155 原廠保養項目與間隔（依保養檢查表整理）。
 * 「里程或時間先到為準」，故同時帶 km 與 months 時兩者皆會判斷。
 */
export const MAINTENANCE_ITEMS: MaintenanceItem[] = [
  {
    key: ENGINE_OIL_KEY,
    name: "引擎機油",
    km: 2000,
    group: "routine",
    note: "最頻繁的項目，騎得勤一年換好幾次",
  },
  {
    key: "gear_oil",
    name: "齒輪油",
    km: 10000,
    group: "routine",
    note: "與機油分開計，約每 1 萬公里更換",
  },
  {
    key: "air_filter",
    name: "空氣濾清器（空濾）",
    km: 3000,
    group: "routine",
    note: "紙質濾芯，髒了直接換、不要清洗重用",
  },
  {
    key: "transmission_filter",
    name: "傳動濾網（小海綿）",
    km: 5000,
    group: "routine",
    note: "乾紙式，同樣不建議清洗後再用",
  },
  {
    key: "brake_fluid",
    name: "煞車油",
    km: 12000,
    months: 12,
    group: "routine",
    note: "先到為準，過久會吸水影響制動",
  },
  {
    key: "coolant",
    name: "冷卻液（水箱精）",
    km: 10000,
    months: 24,
    group: "routine",
    note: "平時養成開副水箱看水位的習慣",
  },
  {
    key: "spark_plug",
    name: "火星塞",
    km: 10000,
    group: "routine",
    note: "檢查間隙、清潔，必要時更換",
  },
  {
    key: "battery",
    name: "電瓶",
    months: 12,
    group: "routine",
    note: "低於 12.8V 或充放不良就換",
    inspectOnly: true,
  },
  {
    key: "brake_pads",
    name: "前後來令片（煞車皮）",
    km: 2000,
    group: "routine",
    note: "每次換機油順手看厚度，剩約 2mm 就換",
    inspectOnly: true,
  },
  {
    key: "tires",
    name: "輪胎／胎壓",
    months: 1,
    group: "routine",
    note: "看胎紋深度與龜裂，胎壓依車身標示",
    inspectOnly: true,
  },
  {
    key: "brake_caliper",
    name: "煞車卡鉗／主缸油封",
    months: 24,
    group: "major",
    note: "拆煞車保養時順便更換",
  },
  {
    key: "drive_belt",
    name: "傳動皮帶",
    km: 20000,
    group: "major",
    note: "原廠皮帶耐用，每 1 萬清傳動時檢查有無裂化",
  },
  {
    key: "pulley",
    name: "普利盤／普利珠／開閉盤",
    km: 20000,
    group: "major",
    note: "拆傳動時一起看磨損",
    inspectOnly: true,
  },
  {
    key: "throttle_body",
    name: "節流閥／噴油嘴清潔",
    km: 20000,
    group: "major",
    note: "馬力明顯下降或熄火再做即可",
  },
  {
    key: "steering_bolt",
    name: "天柱螺絲扭力確認",
    km: 20000,
    group: "major",
    note: "26Nm，分 10→20→26Nm 三段鎖，防衝墊片漏水",
    inspectOnly: true,
  },
  {
    key: "brake_hose",
    name: "煞車油管",
    months: 48,
    group: "major",
    note: "或發現龜裂、漏油立即更換",
  },
];

export function isMaintenanceItem(key: string): boolean {
  return MAINTENANCE_ITEMS.some((item) => item.key === key);
}

/** YYYY-MM-DD 加 n 個月，日數超過目標月底時夾到月底（如 1/31 + 1 月 = 2/28） */
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const day = Math.min(d, daysInMonth);
  return `${ty}-${String(tm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** a - b 的天數差（正＝a 在 b 之後） */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000,
  );
}

export interface MaintenanceStatus {
  key: string;
  name: string;
  group: MaintenanceGroup;
  note: string;
  inspectOnly: boolean;
  km: number | null;
  months: number | null;
  /** 上次保養日期，尚未紀錄為 null */
  lastDate: string | null;
  /** 上次保養里程，尚未紀錄為 null */
  lastMileage: number | null;
  /** 下次到期里程（無里程制為 null） */
  dueMileage: number | null;
  /** 下次到期日（無時間制或無起算基準為 null） */
  dueDate: string | null;
  /** 距到期里程（負數＝已超過，無里程制為 null） */
  kmRemaining: number | null;
  /** 距到期天數（負數＝已超過，無時間制為 null） */
  daysRemaining: number | null;
  dueByKm: boolean;
  dueByTime: boolean;
  /** 里程或時間任一已到（先到為準） */
  due: boolean;
}

/**
 * 純函式：依「目前估算里程」與「各項目上次保養」算出每項是否到期。
 * 里程或時間先到為準；尚未紀錄過的項目以里程 0 與 startDate 作為基準。
 */
export function computeMaintenanceStatus(
  items: MaintenanceItem[],
  lastByKey: Map<string, { date: string; mileage: number }>,
  estMileage: number,
  today: string,
  startDate: string | null,
): MaintenanceStatus[] {
  return items.map((item) => {
    const last = lastByKey.get(item.key) ?? null;
    const baseMileage = last?.mileage ?? 0;
    const baseDate = last?.date ?? startDate;

    const dueMileage = item.km != null ? baseMileage + item.km : null;
    const dueDate =
      item.months != null && baseDate ? addMonths(baseDate, item.months) : null;

    const kmRemaining = dueMileage != null ? dueMileage - estMileage : null;
    const daysRemaining = dueDate != null ? diffDays(dueDate, today) : null;

    const dueByKm = kmRemaining != null && kmRemaining <= 0;
    const dueByTime = daysRemaining != null && daysRemaining <= 0;

    return {
      key: item.key,
      name: item.name,
      group: item.group,
      note: item.note,
      inspectOnly: item.inspectOnly ?? false,
      km: item.km ?? null,
      months: item.months ?? null,
      lastDate: last?.date ?? null,
      lastMileage: last?.mileage ?? null,
      dueMileage,
      dueDate,
      kmRemaining,
      daysRemaining,
      dueByKm,
      dueByTime,
      due: dueByKm || dueByTime,
    };
  });
}
