import { asc } from "drizzle-orm";
import { addRecurring, deleteRecurring } from "@/app/actions";
import { DeleteButton } from "@/app/delete-button";
import { getDb } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";

// 每次請求都讀最新規則，避免建置時打 DB 產生靜態快照
export const dynamic = "force-dynamic";

const INPUT_CLS =
  "rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:text-sm";

function formatAmount(value: string | number): string {
  return Math.round(Number(value)).toLocaleString("zh-TW");
}

/** 規則的排程文字，如「每月 1 號」「每年 3 月 15 號」 */
function scheduleLabel(rule: {
  frequency: string;
  dayOfMonth: number;
  monthOfYear: number | null;
}): string {
  return rule.frequency === "yearly" && rule.monthOfYear
    ? `每年 ${rule.monthOfYear} 月 ${rule.dayOfMonth} 號`
    : `每月 ${rule.dayOfMonth} 號`;
}

export default async function RecurringPage() {
  const rules = await getDb()
    .select()
    .from(recurringExpenses)
    .orderBy(asc(recurringExpenses.dayOfMonth), asc(recurringExpenses.id));

  return (
    <>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
          定期支出
        </h1>
        <p className="mt-1 max-w-[55ch] text-sm leading-7 text-gray-600 text-pretty">
          固定的支出（房租、保險費…）設定後，開啟網站時會自動把到期的款項補進記帳；就算當天沒開網站，下次開啟也會補齊。可選每月或每年；設
          29–31 號遇到較短的月份會落在月底。
        </p>

        <form
          action={addRecurring}
          className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10 sm:grid-cols-[1fr_8rem]"
        >
          {/* 排程：頻率 + 月（每年才用）+ 日 */}
          <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <select name="frequency" defaultValue="monthly" className={INPUT_CLS}>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="number"
                name="monthOfYear"
                min={1}
                max={12}
                defaultValue={1}
                className={`${INPUT_CLS} w-16`}
              />
              月
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="number"
                name="dayOfMonth"
                min={1}
                max={31}
                defaultValue={1}
                required
                className={`${INPUT_CLS} w-16`}
              />
              號
            </label>
            <span className="text-xs text-gray-400">「月」僅每年適用</span>
          </div>
          <input
            type="text"
            name="vendor"
            placeholder="名目（如：房租）"
            required
            className={`${INPUT_CLS} col-span-2`}
          />
          <input
            type="number"
            name="amount"
            placeholder="金額"
            step="any"
            required
            className={`${INPUT_CLS} col-span-2 sm:col-span-1`}
          />
          <select
            name="category"
            defaultValue="房租"
            className={`${INPUT_CLS} col-span-2 sm:col-span-1`}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
            到期
            <input
              type="month"
              name="endMonth"
              className={`${INPUT_CLS} flex-1`}
            />
            <span className="text-xs text-gray-400">留空＝無期限</span>
          </label>
          <button
            type="submit"
            className="col-span-2 rounded-full bg-gray-950 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-800 sm:py-2 sm:text-sm"
          >
            新增
          </button>
        </form>

        {rules.length === 0 ? (
          <p className="mt-12 text-center text-sm leading-7 text-gray-600">
            還沒有定期支出，新增一筆吧。
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <span className="w-24 shrink-0 text-xs text-gray-600">
                  {scheduleLabel(rule)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-950">
                    {rule.vendor}
                  </span>
                  {rule.endMonth && (
                    <span className="block text-xs text-gray-400">
                      至 {rule.endMonth}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-gray-950/[0.025] px-2 py-0.5 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/5">
                  {rule.category}
                </span>
                <span className="shrink-0 text-right text-sm font-medium text-gray-950">
                  {formatAmount(rule.amount)}
                </span>
                <DeleteButton
                  id={rule.id}
                  action={deleteRecurring}
                  message="確定刪除這個定期支出？已產生的紀錄會保留。"
                />
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
