import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/** 一次性補帳的 advisory lock key，避免同時開兩個頁面重複插入 */
const LOCK_KEY = 2026_0102;

/**
 * 一次性補帳：補上 2026 年 1、2 月漏掉的房租。
 * 房租定期支出規則是之後才建立的，自動補帳只從建立當下往後產生，所以 1、2 月沒有紀錄。
 * 依「分類＝房租」的每月規則（名目、金額、每月幾號）補進該月，
 * 該月已有同名目的房租紀錄就略過，可重複執行。
 * 部署並開站跑過一次後即可刪除此檔與呼叫處。
 */
export async function backfillRent2026(): Promise<void> {
  const db = getDb();
  await db.batch([
    db.execute(sql`select pg_advisory_xact_lock(${LOCK_KEY})`),
    db.execute(sql`
      insert into expenses (date, vendor, amount, category)
      select
        make_date(
          2026,
          m.month,
          least(
            r.day_of_month,
            extract(day from make_date(2026, m.month, 1) + interval '1 month' - interval '1 day')::int
          )
        ),
        r.vendor,
        r.amount,
        r.category
      from recurring_expenses r
      cross join (values (1), (2)) as m(month)
      where r.frequency = 'monthly'
        and r.category = '房租'
        and (r.end_month is null or r.end_month >= ('2026-' || lpad(m.month::text, 2, '0')))
        and not exists (
          select 1
          from expenses e
          where e.category = '房租'
            and e.vendor = r.vendor
            and e.date >= make_date(2026, m.month, 1)
            and e.date < make_date(2026, m.month, 1) + interval '1 month'
        )
    `),
  ]);
}
