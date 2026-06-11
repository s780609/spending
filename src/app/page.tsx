import { and, desc, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { addExpense } from "@/app/actions";
import { CategorySelect } from "@/app/category-select";
import { CategoryPie, MonthlyTrend } from "@/app/charts";
import { DeleteButton } from "@/app/delete-button";
import { MonthPicker } from "@/app/month-picker";
import { Nav } from "@/app/nav";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";

function todayTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(
    new Date(),
  );
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("zh-TW");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : todayTaipei().slice(0, 7);

  const db = getDb();
  const rows = await db.query.expenses.findMany({
    where: and(
      gte(expenses.date, `${month}-01`),
      lt(expenses.date, `${shiftMonth(month, 1)}-01`),
    ),
    with: { items: true },
    orderBy: [desc(expenses.date), desc(expenses.id)],
  });

  // 每月加總（趨勢線圖、當年支出用），區間切換在前端做
  const monthExpr = sql<string>`to_char(${expenses.date}, 'YYYY-MM')`;
  const trend = await db
    .select({
      month: monthExpr,
      total: sql<number>`sum(${expenses.amount})::float`,
    })
    .from(expenses)
    .groupBy(monthExpr)
    .orderBy(monthExpr);

  const year = month.slice(0, 4);
  const yearTotal = trend
    .filter((entry) => entry.month.startsWith(`${year}-`))
    .reduce((sum, entry) => sum + entry.total, 0);

  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(
      row.category,
      (byCategory.get(row.category) ?? 0) + Number(row.amount),
    );
  }
  const categorySummary = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/?month=${shiftMonth(month, -1)}`}
              className="rounded-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-950/5"
              aria-label="上個月"
            >
              ←
            </Link>
            <MonthPicker month={month} />
            <Link
              href={`/?month=${shiftMonth(month, 1)}`}
              className="rounded-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-950/5"
              aria-label="下個月"
            >
              →
            </Link>
          </div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
            <p className="text-sm text-gray-600">
              本月支出{" "}
              <span className="text-2xl font-bold tracking-tight text-gray-950">
                NT$ {formatAmount(total)}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {year} 年支出{" "}
              <span className="text-2xl font-bold tracking-tight text-gray-950">
                NT$ {formatAmount(yearTotal)}
              </span>
            </p>
          </div>
        </div>

        {categorySummary.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {categorySummary.map(([category, sum]) => (
              <li
                key={category}
                className="rounded-full bg-white px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-950/10"
              >
                {category}{" "}
                <span className="font-medium text-gray-950">
                  {formatAmount(sum)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {(categorySummary.length > 0 || trend.length > 0) && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {categorySummary.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
                <h2 className="text-sm font-medium text-gray-950">
                  {month} 分類佔比
                </h2>
                <CategoryPie
                  data={categorySummary.map(([name, value]) => ({
                    name,
                    value,
                  }))}
                />
              </section>
            )}
            {trend.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
                <h2 className="text-sm font-medium text-gray-950">
                  每月支出趨勢
                </h2>
                <MonthlyTrend data={trend} />
              </section>
            )}
          </div>
        )}

        <form
          action={addExpense}
          className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10 sm:grid-cols-[10rem_1fr_7rem_auto_auto]"
        >
          <input
            type="date"
            name="date"
            defaultValue={todayTaipei()}
            required
            className="rounded-lg px-3 py-2 text-sm ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950"
          />
          <input
            type="text"
            name="vendor"
            placeholder="店家或描述"
            required
            className="rounded-lg px-3 py-2 text-sm ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950"
          />
          <input
            type="number"
            name="amount"
            placeholder="金額"
            step="any"
            required
            className="rounded-lg px-3 py-2 text-sm ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950"
          />
          <select
            name="category"
            className="rounded-lg px-3 py-2 text-sm ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            新增
          </button>
        </form>

        {rows.length === 0 ? (
          <p className="mt-12 text-center text-sm leading-7 text-gray-600">
            這個月還沒有任何支出紀錄，新增一筆或到「匯入 CSV」匯入電子發票。
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map((row) => {
              const summary = (
                <>
                  <span className="w-12 shrink-0 font-mono text-xs text-gray-600">
                    {row.date.slice(5).replace("-", "/")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-gray-950">
                      {row.vendor}
                    </span>
                    {row.items.length > 0 && (
                      <span className="block text-xs text-gray-400">
                        {row.items.length} 項明細
                      </span>
                    )}
                  </span>
                  <CategorySelect id={row.id} value={row.category} />
                  <span className="w-20 shrink-0 text-right text-sm font-medium text-gray-950">
                    {formatAmount(row.amount)}
                  </span>
                  <DeleteButton id={row.id} />
                </>
              );

              return (
                <li
                  key={row.id}
                  className="rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-950/10"
                >
                  {row.items.length > 0 ? (
                    <details>
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-950/[0.025]">
                        {summary}
                      </summary>
                      <ul className="m-2 space-y-1 rounded-lg bg-gray-950/[0.025] p-3 ring-1 ring-inset ring-gray-950/5">
                        {row.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-4 text-xs leading-6 text-gray-600"
                          >
                            <span className="min-w-0 truncate">{item.name}</span>
                            <span className="shrink-0">
                              {formatAmount(item.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                      {summary}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
