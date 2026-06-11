import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import Link from "next/link";
import {
  updateFamilyCardCategory,
  updateFamilyTransactionCategory,
} from "@/app/actions";
import { CategorySelect } from "@/app/category-select";
import { FamilyImportForm } from "@/app/family-import-form";
import { MonthPicker } from "@/app/month-picker";
import { Nav } from "@/app/nav";
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
      .where(eq(familyCardTransactions.statementMonth, month))
      .orderBy(
        asc(familyCardTransactions.purchaseDate),
        asc(familyCardTransactions.id),
      ),
  ]);

  const bankOut = bankTxs.reduce((s, t) => s + Number(t.withdrawal ?? 0), 0);
  const bankIn = bankTxs.reduce((s, t) => s + Number(t.deposit ?? 0), 0);
  const cardSpend = cardTxs.reduce(
    (s, t) => s + Math.max(Number(t.amount), 0),
    0,
  );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
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

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: `${month} 支出`, value: `NT$ ${fmt(bankOut)}` },
            { label: `${month} 存入`, value: `NT$ ${fmt(bankIn)}` },
            {
              label: `${month} 卡費新增`,
              value: cardStatement
                ? `NT$ ${fmt(cardStatement.newCharges)}`
                : "—",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10"
            >
              <p className="text-xs text-gray-600">{card.label}</p>
              <p className="mt-1 text-base font-bold tracking-tight text-gray-950 sm:text-lg">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <FamilyImportForm />

        {/* ===== 帳戶往來明細 ===== */}
        <h2 className="mt-8 text-lg font-bold tracking-tight text-gray-950">
          帳戶明細
        </h2>
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

        {/* ===== 信用卡消費明細 ===== */}
        <h2 className="mt-8 text-lg font-bold tracking-tight text-gray-950">
          信用卡明細
          {cardTxs.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              消費合計 NT$ {fmt(cardSpend)}
            </span>
          )}
        </h2>
        {cardTxs.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-gray-600">
            {month} 帳單沒有信用卡明細，上傳該月的信用卡電子帳單即可匯入。
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
      </main>
    </>
  );
}
