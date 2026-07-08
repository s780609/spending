import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  lt,
  notInArray,
  notLike,
  sql,
} from "drizzle-orm";
import Link from "next/link";
import {
  updateFamilyCardCategory,
  updateFamilyTransactionCategory,
} from "@/app/actions";
import { CategorySelect } from "@/app/category-select";
import { FamilyChartsPanel } from "@/app/family-charts-panel";
import { MonthPicker } from "@/app/month-picker";
import { getDb } from "@/db";
import {
  familyCardStatements,
  familyCardTransactions,
  familyStatements,
  familyTransactions,
} from "@/db/schema";
import { shiftMonth, todayTaipei } from "@/lib/dates";
import { FAMILY_CATEGORIES } from "@/lib/family-category";

export const dynamic = "force-dynamic";

function fmt(value: string | number): string {
  return Math.round(Number(value)).toLocaleString("zh-TW");
}

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const db = getDb();

  const [latest] = await db
    .select()
    .from(familyStatements)
    .orderBy(desc(familyStatements.month))
    .limit(1);

  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : (latest?.month ?? todayTaipei().slice(0, 7));

  const [bankTxs, [cardStatement], cardTxs] = await Promise.all([
    db
      .select()
      .from(familyTransactions)
      .where(
        and(
          gte(familyTransactions.date, `${month}-01`),
          lt(familyTransactions.date, `${shiftMonth(month, 1)}-01`),
        ),
      )
      .orderBy(asc(familyTransactions.date), asc(familyTransactions.id)),
    db
      .select()
      .from(familyCardStatements)
      .where(eq(familyCardStatements.month, month)),
    db
      .select()
      .from(familyCardTransactions)
      .where(
        and(
          gte(familyCardTransactions.purchaseDate, `${month}-01`),
          lt(familyCardTransactions.purchaseDate, `${shiftMonth(month, 1)}-01`),
        ),
      )
      .orderBy(
        asc(familyCardTransactions.purchaseDate),
        asc(familyCardTransactions.id),
      ),
  ]);

  // 圖表用：每月 × 分類支出加總。
  // 帳戶＝帳戶實際流出（含卡費，僅排除內部轉帳）；信用卡＝卡單消費；
  // 「合併」由前端再過濾：帳戶排除內部轉帳/利息/卡費/未分類/其他、信用卡排除卡費
  const bankMonthExpr = sql<string>`to_char(${familyTransactions.date}, 'YYYY-MM')`;
  const [bankByMonthCat, cardByMonthCat] = await Promise.all([
    db
      .select({
        month: bankMonthExpr,
        category: familyTransactions.category,
        total: sql<number>`sum(${familyTransactions.withdrawal})::float`,
      })
      .from(familyTransactions)
      .where(
        and(
          isNotNull(familyTransactions.withdrawal),
          notInArray(familyTransactions.category, ["內部轉帳"]),
        ),
      )
      .groupBy(bankMonthExpr, familyTransactions.category),
    // 卡單依實際消費日歸月，只排除「自動轉帳扣繳」繳款列，退款以負數淨掉
    db
      .select({
        month: sql<string>`to_char(${familyCardTransactions.purchaseDate}, 'YYYY-MM')`,
        category: familyCardTransactions.category,
        total: sql<number>`sum(${familyCardTransactions.amount})::float`,
      })
      .from(familyCardTransactions)
      .where(notLike(familyCardTransactions.description, "%自動轉帳扣繳%"))
      .groupBy(
        sql`to_char(${familyCardTransactions.purchaseDate}, 'YYYY-MM')`,
        familyCardTransactions.category,
      ),
  ]);
  // 內部轉帳（主/子帳戶互轉）不是真實收支，從支出/存入總額排除；帳戶明細仍照常顯示
  const bankOut = bankTxs.reduce(
    (s, t) => (t.category === "內部轉帳" ? s : s + Number(t.withdrawal ?? 0)),
    0,
  );
  const bankIn = bankTxs.reduce(
    (s, t) => (t.category === "內部轉帳" ? s : s + Number(t.deposit ?? 0)),
    0,
  );
  const bankNet = bankIn - bankOut;
  // 消費合計＝淨額（含退款負數），只排除「自動轉帳扣繳」繳款列
  const cardSpend = cardTxs.reduce(
    (s, t) =>
      t.description.includes("自動轉帳扣繳") ? s : s + Number(t.amount),
    0,
  );

  return (
    <>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/family?month=${shiftMonth(month, -1)}`}
              className="rounded-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-950/5"
              aria-label="上個月"
            >
              ←
            </Link>
            <MonthPicker month={month} basePath="/family" />
            <Link
              href={`/family?month=${shiftMonth(month, 1)}`}
              className="rounded-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-950/5"
              aria-label="下個月"
            >
              →
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            目前存款{" "}
            <span className="text-2xl font-bold tracking-tight text-gray-950">
              NT$ {latest ? fmt(latest.totalBalance) : "—"}
            </span>
            {latest && (
              <span className="ml-1 text-xs text-gray-400">
                （{latest.month} 對帳單）
              </span>
            )}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            {
              label: `${month} 帳戶收支`,
              value: `NT$ ${bankNet > 0 ? "+" : ""}${fmt(bankNet)}`,
              tone:
                bankNet > 0
                  ? "text-green-600"
                  : bankNet < 0
                    ? "text-red-600"
                    : "text-gray-950",
            },
            {
              label: `${month} 卡費新增`,
              value: cardStatement
                ? `NT$ ${fmt(cardStatement.newCharges)}`
                : "—",
              tone: "text-gray-950",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10"
            >
              <p className="text-xs text-gray-600">{card.label}</p>
              <p
                className={`mt-1 text-base font-bold tracking-tight sm:text-lg ${card.tone}`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {(bankByMonthCat.length > 0 || cardByMonthCat.length > 0) && (
          <FamilyChartsPanel
            bank={bankByMonthCat}
            card={cardByMonthCat}
            month={month}
          />
        )}

        {/* ===== 帳戶往來明細 ===== */}
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-bold tracking-tight text-gray-950 [&::-webkit-details-marker]:hidden">
            <svg
              className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 5l6 5-6 5z" />
            </svg>
            帳戶明細
          </summary>
        {bankTxs.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-gray-600">
            {month} 沒有帳戶明細，上傳該月的綜合對帳單即可匯入。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bankTxs.map((tx) => (
              <li
                key={tx.id}
                className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex min-w-0 items-center gap-3 sm:contents">
                    <span className="min-w-0 flex-1 sm:order-2">
                      <span className="block truncate text-sm text-gray-950">
                        {tx.description}
                      </span>
                      {tx.note && (
                        <span className="block truncate text-xs text-gray-400">
                          {tx.note}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-right text-base font-semibold sm:order-4 sm:w-24 sm:text-sm sm:font-medium ${
                        tx.deposit !== null ? "text-green-600" : "text-gray-950"
                      }`}
                    >
                      {tx.deposit !== null
                        ? `+${fmt(tx.deposit)}`
                        : `-${fmt(tx.withdrawal ?? 0)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:contents">
                    <span className="shrink-0 font-mono text-xs text-gray-600 sm:order-1 sm:w-12">
                      {tx.date.slice(5).replace("-", "/")}
                    </span>
                    <span className="sm:order-3">
                      <CategorySelect
                        id={tx.id}
                        value={tx.category}
                        action={updateFamilyTransactionCategory}
                        options={FAMILY_CATEGORIES}
                      />
                    </span>
                    <span className="ml-auto text-xs text-gray-400 sm:order-5 sm:ml-0 sm:w-20 sm:text-right">
                      餘額 {fmt(tx.balance)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </details>

        {/* ===== 信用卡消費明細 ===== */}
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-bold tracking-tight text-gray-950 [&::-webkit-details-marker]:hidden">
            <svg
              className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 5l6 5-6 5z" />
            </svg>
            信用卡明細
            {cardTxs.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                消費合計 NT$ {fmt(cardSpend)}
              </span>
            )}
          </summary>
        {cardTxs.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-gray-600">
            {month} 沒有信用卡明細，上傳包含該月消費的信用卡電子帳單即可匯入。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cardTxs.map((tx) => (
              <li
                key={tx.id}
                className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex min-w-0 items-center gap-3 sm:contents">
                    <span className="min-w-0 flex-1 sm:order-2">
                      <span className="block truncate text-sm text-gray-950">
                        {tx.description}
                      </span>
                      {tx.note && (
                        <span className="block truncate text-xs text-gray-400">
                          {tx.note}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-right text-base font-semibold sm:order-4 sm:w-24 sm:text-sm sm:font-medium ${
                        Number(tx.amount) < 0
                          ? "text-green-600"
                          : "text-gray-950"
                      }`}
                    >
                      {fmt(tx.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:contents">
                    <span className="shrink-0 font-mono text-xs text-gray-600 sm:order-1 sm:w-12">
                      {tx.purchaseDate.slice(5).replace("-", "/")}
                    </span>
                    <span className="sm:order-3">
                      <CategorySelect
                        id={tx.id}
                        value={tx.category}
                        action={updateFamilyCardCategory}
                        options={FAMILY_CATEGORIES}
                      />
                    </span>
                    {tx.cardLast4 && (
                      <span className="ml-auto rounded-full bg-gray-950/[0.025] px-2 py-0.5 font-mono text-xs text-gray-600 ring-1 ring-inset ring-gray-950/5 sm:order-5 sm:ml-0">
                        {tx.cardLast4}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </details>
    </>
  );
}
