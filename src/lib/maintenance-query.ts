import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { bikeSettings, maintenanceRecords } from "@/db/schema";
import {
  computeMaintenanceStatus,
  estimateDailyKm,
  MAINTENANCE_ITEMS,
  type MaintenanceStatus,
} from "@/lib/maintenance";

export interface BikeSettings {
  startDate: string | null;
  mileageAdjustment: number;
  /** 目前里程最後更新日，未紀錄為 null */
  mileageUpdatedOn: string | null;
}

const DEFAULT_SETTINGS: BikeSettings = {
  startDate: null,
  mileageAdjustment: 0,
  mileageUpdatedOn: null,
};

export interface MaintenanceRecordRow {
  id: number;
  itemKey: string;
  date: string;
  mileage: number;
  note: string | null;
  cost: number | null;
  expenseId: number | null;
}

export interface MaintenanceData {
  status: MaintenanceStatus[];
  records: MaintenanceRecordRow[];
  settings: BikeSettings;
  /** 目前里程（手動輸入的校正值） */
  estMileage: number;
  /** 推估平均每日里程，資料不足為 null */
  dailyKm: number | null;
  /** 目前里程的觀測日：更新日，沒有則為最近一筆紀錄日，再沒有則為今天 */
  mileageAsOf: string;
}

/** 讀單列設定，未設定時回傳預設（不寫入，避免在頁面渲染時產生副作用） */
export async function getBikeSettings(): Promise<BikeSettings> {
  const [row] = await getDb().select().from(bikeSettings).limit(1);
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  return {
    startDate: row.startDate,
    mileageAdjustment: row.mileageAdjustment,
    mileageUpdatedOn: row.mileageUpdatedOn,
  };
}

/** 彙整保養狀態：目前估算里程、各項目到期狀態、近期紀錄。 */
export async function getMaintenanceData(
  today: string,
): Promise<MaintenanceData> {
  const db = getDb();
  const settings = await getBikeSettings();
  const records = await db
    .select()
    .from(maintenanceRecords)
    .orderBy(desc(maintenanceRecords.date), desc(maintenanceRecords.id));

  const estMileage = settings.mileageAdjustment;

  // records 已依日期、id 由新到舊排序，故每個 itemKey 第一次出現即為最新一筆
  const lastByKey = new Map<string, { date: string; mileage: number }>();
  for (const r of records) {
    if (!lastByKey.has(r.itemKey)) {
      lastByKey.set(r.itemKey, { date: r.date, mileage: r.mileage });
    }
  }

  const status = computeMaintenanceStatus(
    MAINTENANCE_ITEMS,
    lastByKey,
    estMileage,
    today,
    settings.startDate,
  );

  const mileageAsOf = settings.mileageUpdatedOn ?? records[0]?.date ?? today;
  const dailyKm = estimateDailyKm(
    [
      ...records.map((r) => ({ date: r.date, mileage: r.mileage })),
      ...(settings.mileageUpdatedOn
        ? [{ date: settings.mileageUpdatedOn, mileage: estMileage }]
        : []),
    ],
    today,
  );

  return {
    status,
    records: records.map((r) => ({
      id: r.id,
      itemKey: r.itemKey,
      date: r.date,
      mileage: r.mileage,
      note: r.note,
      cost: r.cost === null ? null : Number(r.cost),
      expenseId: r.expenseId,
    })),
    settings,
    estMileage,
    dailyKm,
    mileageAsOf,
  };
}
