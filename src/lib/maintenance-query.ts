import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { bikeSettings, maintenanceRecords } from "@/db/schema";
import {
  computeMaintenanceStatus,
  ENGINE_OIL_KEY,
  MAINTENANCE_ITEMS,
  type MaintenanceStatus,
} from "@/lib/maintenance";

export interface BikeSettings {
  startDate: string | null;
  kmPerOilChange: number;
  mileageAdjustment: number;
}

const DEFAULT_SETTINGS: BikeSettings = {
  startDate: null,
  kmPerOilChange: 2000,
  mileageAdjustment: 0,
};

export interface MaintenanceRecordRow {
  id: number;
  itemKey: string;
  date: string;
  mileage: number;
  note: string | null;
}

export interface MaintenanceData {
  status: MaintenanceStatus[];
  records: MaintenanceRecordRow[];
  settings: BikeSettings;
  /** 換機油次數 */
  oilCount: number;
  /** 目前估算里程 = oilCount × kmPerOilChange + mileageAdjustment */
  estMileage: number;
}

/** 讀單列設定，未設定時回傳預設（不寫入，避免在頁面渲染時產生副作用） */
export async function getBikeSettings(): Promise<BikeSettings> {
  const [row] = await getDb().select().from(bikeSettings).limit(1);
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  return {
    startDate: row.startDate,
    kmPerOilChange: row.kmPerOilChange,
    mileageAdjustment: row.mileageAdjustment,
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

  const oilCount = records.filter((r) => r.itemKey === ENGINE_OIL_KEY).length;
  const estMileage =
    oilCount * settings.kmPerOilChange + settings.mileageAdjustment;

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

  return {
    status,
    records: records.map((r) => ({
      id: r.id,
      itemKey: r.itemKey,
      date: r.date,
      mileage: r.mileage,
      note: r.note,
    })),
    settings,
    oilCount,
    estMileage,
  };
}
