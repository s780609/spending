import { addBudget, deleteBudget } from "@/app/actions";
import { DeleteButton } from "@/app/delete-button";
import { getDb } from "@/db";
import { budgets } from "@/db/schema";
import { asc } from "drizzle-orm";
import { CATEGORIES } from "@/lib/categories";
import { getBudgetStatus } from "@/lib/budget-query";
import { todayTaipei } from "@/lib/dates";

// 每次請求都讀最新花費與預算，避免建置時打 DB 產生靜態快照
export const dynamic = "force-dynamic";

function formatAmount(value: string | number): string {
  return Math.round(Number(value)).toLocaleString("zh-TW");
}

// 可設定預算的分類（排除「未分類」這種暫存桶）
const BUDGET_CATEGORIES = CATEGORIES.filter((c) => c !== "未分類");

export default async function BudgetPage() {
  const month = todayTaipei().slice(0, 7);
  const status = await getBudgetStatus(month);
  // 取 id 供刪除用（getBudgetStatus 只回狀態，不含 id）
  const rows = await getDb()
    .select()
    .from(budgets)
    .orderBy(asc(budgets.category), asc(budgets.id));
  const idByCategory = new Map(rows.map((r) => [r.category, r.id]));

  return (
    <>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
        預算
      </h1>
      <p className="mt-1 max-w-[55ch] text-sm leading-7 text-gray-600 text-pretty">
        為各分類設定每月預算（例如手遊）。下方顯示的是「{month}」當月花費，超出預算會變紅；
        當月只要有任一分類超支，每天第一次進入記帳頁時會跳出提醒，直到月底。重複設定同一分類即更新金額。
      </p>

      <form
        action={addBudget}
        className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10 sm:grid-cols-[1fr_8rem_auto]"
      >
        <select
          name="category"
          defaultValue="手遊"
          className="order-1 col-span-2 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:order-none sm:col-span-1 sm:text-sm"
        >
          {BUDGET_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="amount"
          placeholder="每月預算"
          min={0}
          step="any"
          required
          className="order-2 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:order-none sm:text-sm"
        />
        <button
          type="submit"
          className="order-3 rounded-full bg-gray-950 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-800 sm:order-none sm:py-2 sm:text-sm"
        >
          設定
        </button>
      </form>

      {status.length === 0 ? (
        <p className="mt-12 text-center text-sm leading-7 text-gray-600">
          還沒有設定任何預算，先設一筆手遊預算吧。
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {status.map((s) => {
            const id = idByCategory.get(s.category);
            const pct = Math.min(100, Math.round(s.ratio * 100));
            return (
              <li
                key={s.category}
                className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${
                  s.over ? "ring-red-500/30" : "ring-gray-950/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 rounded-full bg-gray-950/[0.025] px-2 py-0.5 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/5">
                    {s.category}
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-right text-sm tabular-nums ${
                      s.over ? "font-semibold text-red-600" : "text-gray-950"
                    }`}
                  >
                    {formatAmount(s.spent)}
                    <span className="text-gray-400"> / {formatAmount(s.budget)}</span>
                  </span>
                  {id !== undefined && (
                    <DeleteButton
                      id={id}
                      action={deleteBudget}
                      message={`確定刪除「${s.category}」的預算？`}
                    />
                  )}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-950/[0.06]">
                  <div
                    className={`h-full rounded-full ${
                      s.over ? "bg-red-500" : "bg-gray-950"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {s.over && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    已超出預算 NT$ {formatAmount(s.spent - s.budget)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
