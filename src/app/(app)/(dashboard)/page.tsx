import { asc, desc, isNotNull, notInArray, notLike, sql } from "drizzle-orm";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavPendingSkeleton } from "@/app/nav-pending-skeleton";
import { ChangeBadge, SpendingHero, Sparkline } from "@/app/spending-dashboard";
import { getDb } from "@/db";
import {
  expenses,
  familyCardTransactions,
  familyStatements,
  familyTransactions,
  loans,
  networthSnapshots,
} from "@/db/schema";
import { getBudgetStatus } from "@/lib/budget-query";
import { todayTaipei } from "@/lib/dates";
import { familyEntriesBySource } from "@/lib/family-category";
import { generateRecurringExpenses } from "@/lib/generate-recurring";
import { PLEDGE_ALERT_DAYS, pledgeExtensionDeadline } from "@/lib/loan-math";
import { getMaintenanceData } from "@/lib/maintenance-query";
import {
  CARD,
  lastMonths,
  monthlyTotals,
  monthStats,
  ntd,
  pct,
} from "@/lib/spending-stats";

export const dynamic = "force-dynamic";

/** 迷你折線圖涵蓋的月數 */
const SPARK_MONTHS = 12;

/** 淨資產變化的比較基準：約一個月前的快照 */
const NETWORTH_COMPARE_DAYS = 30;

interface Reminder {
  key: string;
  text: string;
  href: string;
}

/** 整張可點的摘要卡：標題列＋大數字＋說明＋迷你折線＋選配內容 */
function SummaryCard({
  title,
  href,
  label,
  value,
  lines,
  spark,
  children,
}: {
  title: string;
  href: string;
  label: string;
  value: string;
  lines: ReactNode[];
  spark: number[];
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${CARD} block transition hover:ring-gray-950/20 dark:hover:ring-white/20`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">{title}</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">前往 →</span>
      </div>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="sensitive mt-0.5 text-xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
        {value}
      </p>
      {lines.map((line, i) => (
        <p key={i} className="sensitive mt-0.5 text-xs text-gray-600 dark:text-gray-400">
          {line}
        </p>
      ))}
      <div className="mt-2">
        <Sparkline values={spark} />
      </div>
      {children}
      <NavPendingSkeleton topSelector="header" className="py-8" />
    </Link>
  );
}

/** 小型比例條（預算使用率、負債比） */
function MiniMeter({ ratio, label }: { ratio: number; label: string }) {
  const fill = Math.min(100, Math.max(0, ratio * 100));
  const color = ratio > 1 ? "bg-red-500" : ratio > 0.8 ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="sensitive mt-2">
      <div className="flex h-1.5 gap-0.5">
        {fill > 0 && <div className={`rounded-full ${color}`} style={{ width: `${fill}%` }} />}
        {fill < 100 && <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />}
      </div>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

function daysAgo(today: string, days: number): string {
  return new Date(Date.parse(today) - days * 86_400_000).toISOString().slice(0, 10);
}

function pledgeText(days: number): string {
  if (days < 0) {
    return `已超期 ${-days} 天`;
  }
  return days === 0 ? "今天到期" : `剩 ${days} 天`;
}

export default async function DashboardPage() {
  await generateRecurringExpenses();
  const db = getDb();
  const today = todayTaipei();
  const month = today.slice(0, 7);

  const expenseMonthExpr = sql<string>`to_char(${expenses.date}, 'YYYY-MM')`;
  const bankMonthExpr = sql<string>`to_char(${familyTransactions.date}, 'YYYY-MM')`;
  const cardMonthExpr = sql<string>`to_char(${familyCardTransactions.purchaseDate}, 'YYYY-MM')`;

  const [
    expenseTrend,
    bankByMonthCat,
    cardByMonthCat,
    [latestStatement],
    snapshots,
    loanRows,
    budget,
    maintenance,
  ] = await Promise.all([
    db
      .select({
        month: expenseMonthExpr,
        total: sql<number>`sum(${expenses.amount})::float`,
      })
      .from(expenses)
      .groupBy(expenseMonthExpr)
      .orderBy(expenseMonthExpr),
    // 家庭支出與家庭頁「合併」同口徑：先取月 × 分類，再交給 familyEntriesBySource 排除
    db
      .select({
        month: bankMonthExpr,
        category: familyTransactions.category,
        total: sql<number>`sum(${familyTransactions.withdrawal})::float`,
      })
      .from(familyTransactions)
      .where(
        sql`${isNotNull(familyTransactions.withdrawal)} and ${notInArray(familyTransactions.category, ["內部轉帳"])}`,
      )
      .groupBy(bankMonthExpr, familyTransactions.category),
    db
      .select({
        month: cardMonthExpr,
        category: familyCardTransactions.category,
        total: sql<number>`sum(${familyCardTransactions.amount})::float`,
      })
      .from(familyCardTransactions)
      .where(notLike(familyCardTransactions.description, "%自動轉帳扣繳%"))
      .groupBy(cardMonthExpr, familyCardTransactions.category),
    db
      .select()
      .from(familyStatements)
      .orderBy(desc(familyStatements.month))
      .limit(1),
    db.select().from(networthSnapshots).orderBy(asc(networthSnapshots.date)),
    db.select().from(loans),
    getBudgetStatus(month),
    getMaintenanceData(today),
  ]);

  // ===== 資產（主卡） =====
  const latest = snapshots[snapshots.length - 1];
  const cutoff = daysAgo(today, NETWORTH_COMPARE_DAYS);
  const base = [...snapshots].reverse().find((s) => s.date <= cutoff) ?? snapshots[0];
  const netWorth = latest ? Number(latest.netWorth) : 0;
  const baseNetWorth = base && base !== latest ? Number(base.netWorth) : null;
  const netWorthChange =
    baseNetWorth !== null && baseNetWorth !== 0
      ? (netWorth - baseNetWorth) / Math.abs(baseNetWorth)
      : null;
  const totalAssets = latest ? Number(latest.totalAssets) : 0;
  const totalLiabilities = latest ? Number(latest.totalLiabilities) : 0;

  // ===== 記帳 =====
  const expense = monthStats(expenseTrend, month);
  const budgetTotal = budget.reduce((s, b) => s + b.budget, 0);
  const budgetSpent = budget.reduce((s, b) => s + b.spent, 0);

  // ===== 家庭 =====
  const familyTrend = monthlyTotals(familyEntriesBySource(bankByMonthCat, cardByMonthCat, "all"));
  const family = monthStats(familyTrend, month);

  // ===== 提醒 =====
  const reminders: Reminder[] = [
    ...budget
      .filter((b) => b.over)
      .map((b) => ({
        key: `budget-${b.category}`,
        text: `${b.category}超出預算（${pct(b.ratio)}）`,
        href: "/expenses",
      })),
    ...loanRows
      .filter((loan) => loan.type === "質押")
      .map((loan) => ({
        loan,
        ext: pledgeExtensionDeadline(loan.startDate, today, loan.extensionCount),
      }))
      .filter(({ ext }) => ext.daysRemaining <= PLEDGE_ALERT_DAYS)
      .sort((a, b) => a.ext.daysRemaining - b.ext.daysRemaining)
      .map(({ loan, ext }) => ({
        key: `pledge-${loan.id}`,
        text: `${loan.name}展期${pledgeText(ext.daysRemaining)}`,
        href: "/assets",
      })),
    ...maintenance.status
      .filter((s) => s.due)
      .map((s) => ({
        key: `bike-${s.key}`,
        text: `機車${s.name}該${s.inspectOnly ? "檢查" : "更換"}`,
        href: "/motorcycle",
      })),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
        總覽
      </h1>

      <SpendingHero
        label="淨資產"
        value={netWorth}
        lines={[
          [
            <ChangeBadge
              key="c"
              change={netWorthChange}
              label={base && base !== latest ? `較 ${base.date.slice(5)}` : "較前期"}
              upIsGood
            />,
            `快照 ${latest?.date ?? "—"}`,
          ],
        ]}
        meter={
          totalAssets > 0
            ? {
                ratio: totalLiabilities / totalAssets,
                label: `負債佔總資產 ${pct(totalLiabilities / totalAssets)}`,
              }
            : undefined
        }
      />

      {reminders.length > 0 && (
        <section className="mt-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-950/20 dark:ring-amber-400/30">
          <h2 className="text-sm font-medium text-amber-800 dark:text-amber-300">
            提醒 · {reminders.length} 項
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {reminders.map((r) => (
              <li key={r.key}>
                <Link
                  href={r.href}
                  className="block rounded-full bg-white px-3 py-1 text-xs text-gray-950 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-100 dark:bg-gray-900 dark:text-gray-50 dark:ring-amber-400/30 dark:hover:bg-gray-800"
                >
                  {r.text} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          title="記帳"
          href="/expenses"
          label={`${month} 支出`}
          value={ntd(expense.current)}
          lines={[
            <ChangeBadge key="c" change={expense.change} />,
            `${expense.year} 年累計 ${ntd(expense.yearTotal)}`,
          ]}
          spark={lastMonths(expenseTrend, month, SPARK_MONTHS)}
        >
          {budgetTotal > 0 && (
            <MiniMeter
              ratio={budgetSpent / budgetTotal}
              label={`預算使用 ${pct(budgetSpent / budgetTotal)}`}
            />
          )}
        </SummaryCard>

        <SummaryCard
          title="家庭"
          href="/family"
          label={`${month} 支出`}
          value={ntd(family.current)}
          lines={[
            <ChangeBadge key="c" change={family.change} />,
            latestStatement
              ? `存款 ${ntd(Number(latestStatement.totalBalance))}（${latestStatement.month}）`
              : "存款 —",
          ]}
          spark={lastMonths(familyTrend, month, SPARK_MONTHS)}
        />

        <SummaryCard
          title="資產"
          href="/assets"
          label="總資產"
          value={ntd(totalAssets)}
          lines={[
            `總負債 ${ntd(totalLiabilities)}`,
            `槓桿 ${latest?.leverage ? Number(latest.leverage).toFixed(2) : "—"}`,
          ]}
          spark={snapshots.slice(-90).map((s) => Number(s.netWorth))}
        />
      </div>

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        家庭支出與家庭頁「合併」同口徑。資產數字取自最新每日快照；開「資產」頁會以即時股價重算並更新快照。迷你折線為近 {SPARK_MONTHS} 個月（資產為近 90 筆快照）。
      </p>
    </main>
  );
}
