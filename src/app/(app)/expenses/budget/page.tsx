import { addBudget, deleteBudget } from "@/app/actions";
import { DeleteButton } from "@/app/delete-button";
import { getDb } from "@/db";
import { budgets } from "@/db/schema";
import { asc } from "drizzle-orm";
import { CATEGORIES } from "@/lib/categories";
import { BUDGET_LOOKBACK, getBudgetProjection } from "@/lib/budget-query";
import { shiftMonth, todayTaipei } from "@/lib/dates";

// 每次請求都讀最新花費與預算，避免建置時打 DB 產生靜態快照
export const dynamic = "force-dynamic";

function formatAmount(value: string | number): string {
  return Math.round(Number(value)).toLocaleString("zh-TW");
}

// 可設定預算的分類（排除「未分類」這種暫存桶）
const BUDGET_CATEGORIES = CATEGORIES.filter((c) => c !== "未分類");

export default async function BudgetPage() {
  const month = todayTaipei().slice(0, 7);
  const status = await getBudgetProjection(month);
  // 取 id 供刪除用（getBudgetStatus 只回狀態，不含 id）
  const rows = await getDb()
    .select()
    .from(budgets)
    .orderBy(asc(budgets.category), asc(budgets.id));
  const idByCategory = new Map(rows.map((r) => [r.category, r.id]));

  // 前 N 個完整月的月份區間標籤，如「3–5 月」
  const trailStartMonth = shiftMonth(month, -BUDGET_LOOKBACK);
  const trailEndMonth = shiftMonth(month, -1);
  const trailRange = `${Number(trailStartMonth.slice(5, 7))}–${Number(
    trailEndMonth.slice(5, 7),
  )} 月`;

  return (
    <>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
        預算
      </h1>
      <p className="mt-1 max-w-[62ch] text-sm leading-7 text-gray-600 text-pretty">
        為各分類設定每月預算（例如手遊）。每張卡同時顯示兩個視角：
        <span className="font-medium text-gray-700">當月</span>
        ＝「{month}」已入帳花費（深色）＋過去 3 個完整月平均推估的月底預估（淺色），
        因發票/帳單延遲、當月實際偏低，故以平均提早預警（預估超支轉琥珀、實際超支轉紅）；
        <span className="font-medium text-gray-700">前 3 個月</span>
        ＝{trailRange}（不含當月）實際總額對比「月預算 × 3」，用完整資料看這段是否超支。
        重複設定同一分類即更新金額。
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
            const projectedPct = Math.min(
              100,
              Math.round(s.projectedRatio * 100),
            );
            const trailingPct = Math.min(
              100,
              Math.round(s.trailingRatio * 100),
            );
            // 已實際超支（紅）優先於僅預估超支（琥珀）
            const ring = s.over
              ? "ring-red-500/30"
              : s.projectedOver
                ? "ring-amber-500/40"
                : "ring-gray-950/10";
            return (
              <li
                key={s.category}
                className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${ring}`}
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
                <p className="mt-3 text-xs font-medium text-gray-400">當月</p>
                {/* 淺色＝月底預估、深色＝當月已入帳，疊在同一條上 */}
                <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-950/[0.06]">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      s.projectedOver ? "bg-amber-400/60" : "bg-gray-950/20"
                    }`}
                    style={{ width: `${projectedPct}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      s.over ? "bg-red-500" : "bg-gray-950"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-500 tabular-nums">
                    月底預估 {formatAmount(s.projected)}
                    <span className="text-gray-400">
                      {" "}
                      · 前 3 月平均 {formatAmount(s.average)}
                    </span>
                  </span>
                  {s.over ? (
                    <span className="shrink-0 font-medium text-red-600 tabular-nums">
                      已超支 {formatAmount(s.spent - s.budget)}
                    </span>
                  ) : s.projectedOver ? (
                    <span className="shrink-0 font-medium text-amber-600 tabular-nums">
                      預估超支 {formatAmount(s.projected - s.budget)}
                    </span>
                  ) : (
                    <span className="shrink-0 text-gray-400 tabular-nums">
                      預估結餘 {formatAmount(s.budget - s.projected)}
                    </span>
                  )}
                </div>

                {/* 前 N 個完整月（不含當月）：實際總額 vs 月預算 × N */}
                <div className="mt-3 border-t border-gray-950/5 pt-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-gray-400">
                      前 {s.lookback} 個月（{trailRange}）
                    </span>
                    <span
                      className={`tabular-nums ${
                        s.trailingOver
                          ? "font-semibold text-red-600"
                          : "text-gray-950"
                      }`}
                    >
                      {formatAmount(s.trailingSpent)}
                      <span className="text-gray-400">
                        {" "}
                        / {formatAmount(s.trailingBudget)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-950/[0.06]">
                    <div
                      className={`h-full rounded-full ${
                        s.trailingOver ? "bg-red-500" : "bg-gray-950"
                      }`}
                      style={{ width: `${trailingPct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-right text-xs">
                    {s.trailingOver ? (
                      <span className="font-medium text-red-600 tabular-nums">
                        超支 {formatAmount(s.trailingSpent - s.trailingBudget)}
                      </span>
                    ) : (
                      <span className="text-gray-400 tabular-nums">
                        結餘 {formatAmount(s.trailingBudget - s.trailingSpent)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
