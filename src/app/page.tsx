import { desc, isNotNull, ne, notLike, sql } from "drizzle-orm";
import Link from "next/link";
import { NetWorthChart } from "@/app/asset-charts";
import { MonthlyTrend } from "@/app/charts";
import { Nav } from "@/app/nav";
import { getDb } from "@/db";
import {
  expenses,
  familyCardTransactions,
  familyStatements,
  familyTransactions,
  networthSnapshots,
} from "@/db/schema";
import { todayTaipei } from "@/lib/dates";
import { generateRecurringExpenses } from "@/lib/generate-recurring";

export const dynamic = "force-dynamic";

function ntd(value: number | string): string {
  return `NT$ ${Math.round(Number(value)).toLocaleString("zh-TW")}`;
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight text-gray-950">
        {title}
      </h2>
      <Link
        href={href}
        className="rounded-full px-3 py-1 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/10 hover:bg-gray-950/5"
      >
        前往 →
      </Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-1 text-base font-bold tracking-tight text-gray-950 sm:text-lg">
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  await generateRecurringExpenses();
  const db = getDb();
  const month = todayTaipei().slice(0, 7);
  const year = month.slice(0, 4);

  const expenseMonthExpr = sql<string>`to_char(${expenses.date}, 'YYYY-MM')`;
  const bankMonthExpr = sql<string>`to_char(${familyTransactions.date}, 'YYYY-MM')`;
  const cardMonthExpr = sql<string>`to_char(${familyCardTransactions.purchaseDate}, 'YYYY-MM')`;

  const [expenseTrend, bankByMonth, cardByMonth, [latestStatement], snapshots] =
    await Promise.all([
      db
        .select({
          month: expenseMonthExpr,
          total: sql<number>`sum(${expenses.amount})::float`,
        })
        .from(expenses)
        .groupBy(expenseMonthExpr)
        .orderBy(expenseMonthExpr),
      db
        .select({
          month: bankMonthExpr,
          total: sql<number>`sum(${familyTransactions.withdrawal})::float`,
        })
        .from(familyTransactions)
        .where(
          sql`${isNotNull(familyTransactions.withdrawal)} and ${ne(familyTransactions.category, "內部轉帳")} and ${ne(familyTransactions.category, "卡費")}`,
        )
        .groupBy(bankMonthExpr),
      db
        .select({
          month: cardMonthExpr,
          total: sql<number>`sum(${familyCardTransactions.amount})::float`,
        })
        .from(familyCardTransactions)
        .where(notLike(familyCardTransactions.description, "%自動轉帳扣繳%"))
        .groupBy(cardMonthExpr),
      db
        .select()
        .from(familyStatements)
        .orderBy(desc(familyStatements.month))
        .limit(1),
      db.select().from(networthSnapshots).orderBy(networthSnapshots.date),
    ]);

  const expenseThisMonth =
    expenseTrend.find((e) => e.month === month)?.total ?? 0;
  const expenseThisYear = expenseTrend
    .filter((e) => e.month.startsWith(`${year}-`))
    .reduce((s, e) => s + e.total, 0);

  const familyByMonth = new Map<string, number>();
  for (const entry of [...bankByMonth, ...cardByMonth]) {
    familyByMonth.set(
      entry.month,
      (familyByMonth.get(entry.month) ?? 0) + entry.total,
    );
  }
  const familyTrend = [...familyByMonth.entries()]
    .map(([m, total]) => ({ month: m, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const familyThisMonth = familyByMonth.get(month) ?? 0;

  const latestSnapshot = snapshots[snapshots.length - 1];
  const snapshotChart = snapshots.map((row) => ({
    date: row.date.slice(5),
    netWorth: Number(row.netWorth),
    leverage: row.leverage === null ? null : Number(row.leverage),
  }));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">
          總覽
        </h1>

        {/* ===== 記帳 ===== */}
        <SectionHeader title="記帳" href="/expenses" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label={`${month} 支出`} value={ntd(expenseThisMonth)} />
          <StatCard label={`${year} 年支出`} value={ntd(expenseThisYear)} />
        </div>
        {expenseTrend.length > 0 && (
          <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
            <h3 className="text-sm font-medium text-gray-950">每月支出趨勢</h3>
            <MonthlyTrend data={expenseTrend} />
          </section>
        )}

        {/* ===== 家庭 ===== */}
        <SectionHeader title="家庭" href="/family" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            label={
              latestStatement
                ? `目前存款（${latestStatement.month}）`
                : "目前存款"
            }
            value={latestStatement ? ntd(latestStatement.totalBalance) : "—"}
          />
          <StatCard label={`${month} 家庭支出`} value={ntd(familyThisMonth)} />
        </div>
        {familyTrend.length > 0 && (
          <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
            <h3 className="text-sm font-medium text-gray-950">每月支出趨勢</h3>
            <MonthlyTrend data={familyTrend} />
          </section>
        )}

        {/* ===== 資產 ===== */}
        <SectionHeader title="資產" href="/assets" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="總資產"
            value={latestSnapshot ? ntd(latestSnapshot.totalAssets) : "—"}
          />
          <StatCard
            label="總負債"
            value={latestSnapshot ? ntd(latestSnapshot.totalLiabilities) : "—"}
          />
          <StatCard
            label="淨資產"
            value={latestSnapshot ? ntd(latestSnapshot.netWorth) : "—"}
          />
          <StatCard
            label="槓桿比率"
            value={
              latestSnapshot?.leverage
                ? Number(latestSnapshot.leverage).toFixed(2)
                : "—"
            }
          />
        </div>
        {snapshotChart.length > 0 && (
          <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
            <h3 className="text-sm font-medium text-gray-950">
              淨資產與槓桿走勢
            </h3>
            <NetWorthChart data={snapshotChart} />
          </section>
        )}
        <p className="mt-2 text-xs text-gray-400">
          資產數字取自最新每日快照（{latestSnapshot?.date ?? "—"}
          ）；開「資產」頁會以即時股價重算並更新快照。
        </p>
      </main>
    </>
  );
}
