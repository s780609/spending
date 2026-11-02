import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { getDb } from "../db";
import { expenses } from "../db/schema";

/**
 * 上一版一次性補帳（backfillRent2026）於 2026-11-02 01:36 UTC 合併上線，
 * 誤把 2026 年 1、2 月房租補進個人記帳。此處刪除那幾筆：
 * 日期在 2026-01～02、分類為房租、非發票匯入、且在該版上線後才建立，
 * 不會動到原本就存在的紀錄。可重複執行；跑過一次後即可刪除此檔與呼叫處。
 */
export async function cleanupRentBackfill2026(): Promise<void> {
  await getDb()
    .delete(expenses)
    .where(
      and(
        eq(expenses.category, "房租"),
        gte(expenses.date, "2026-01-01"),
        lt(expenses.date, "2026-03-01"),
        isNull(expenses.invoiceNumber),
        gte(expenses.createdAt, new Date("2026-11-02T01:36:00Z")),
      ),
    );
}
