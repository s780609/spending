import { asc } from "drizzle-orm";
import { addRecurring, deleteRecurring } from "@/app/actions";
import { DeleteButton } from "@/app/delete-button";
import { Nav } from "@/app/nav";
import { getDb } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";

// 每次請求都讀最新規則，避免建置時打 DB 產生靜態快照
export const dynamic = "force-dynamic";

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("zh-TW");
}

export default async function RecurringPage() {
  const rules = await getDb()
    .select()
    .from(recurringExpenses)
    .orderBy(asc(recurringExpenses.dayOfMonth), asc(recurringExpenses.id));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">
          定期支出
        </h1>
        <p className="mt-1 max-w-[55ch] text-sm leading-7 text-gray-600 text-pretty">
          每月固定的支出（房租、保險費…）設定後，開啟網站時會自動把到期的款項補進記帳；就算當天沒開網站，下次開啟也會補齊。設
          29–31 號遇到較短的月份會落在月底。
        </p>

        <form
          action={addRecurring}
          className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10 sm:grid-cols-[8rem_1fr_8rem]"
        >
          <label className="order-2 flex items-center gap-2 text-sm text-gray-600 sm:order-none">
            每月
            <input
              type="number"
              name="dayOfMonth"
              min={1}
              max={31}
              defaultValue={1}
              required
              className="w-14 rounded-lg px-2 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:text-sm"
            />
            號
          </label>
          <input
            type="text"
            name="vendor"
            placeholder="名目（如：房租）"
            required
            className="order-1 col-span-2 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:order-none sm:col-span-1 sm:text-sm"
          />
          <input
            type="number"
            name="amount"
            placeholder="金額"
            step="any"
            required
            className="order-3 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:order-none sm:text-sm"
          />
          <select
            name="category"
            defaultValue="房租"
            className="order-4 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:order-none sm:text-sm"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <label className="order-5 col-span-2 flex items-center gap-2 text-sm text-gray-600 sm:order-none sm:col-span-1">
            到期
            <input
              type="month"
              name="endMonth"
              className="flex-1 rounded-lg px-2 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:text-sm"
            />
            <span className="text-xs text-gray-400">留空＝無期限</span>
          </label>
          <button
            type="submit"
            className="order-6 col-span-2 rounded-full bg-gray-950 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-800 sm:order-none sm:col-span-1 sm:py-2 sm:text-sm"
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
                <span className="w-16 shrink-0 font-mono text-xs text-gray-600">
                  每月 {rule.dayOfMonth} 號
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
      </main>
    </>
  );
}
