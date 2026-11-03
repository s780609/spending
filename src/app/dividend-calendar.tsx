import type { MonthlyDividend } from "@/lib/dividend-schedule";

/** 預設展開的月份數（含當月），方便一眼看到近期入帳明細 */
const DEFAULT_OPEN_MONTHS = 3;

function ntd(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  return `${year}/${m}`;
}

function shortDate(date: string): string {
  return date.slice(5).replace("-", "/");
}

/** 預估各月股利入帳：每月一列（量條＋金額），點開看各檔明細 */
export function DividendCalendar({
  months,
  incomplete,
}: {
  months: MonthlyDividend[];
  /** 有代號抓不到配息紀錄 */
  incomplete: boolean;
}) {
  const max = Math.max(0, ...months.map((m) => m.totalTwd));
  const total = months.reduce((sum, m) => sum + m.totalTwd, 0);

  return (
    <section className="mt-3 rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">
          預估各月股利入帳
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          未來 12 個月{" "}
          <span className="sensitive text-sm font-semibold text-gray-950 dark:text-gray-50">
            {ntd(total)}
          </span>
        </p>
      </div>
      <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-gray-500 text-pretty">
        依近 12 個月除息紀錄往後推一年；發放日為估計（台股除息後約 24 天、美股 ETF 約 4 天、美股個股約 3 週），以現有股數計算，美股為稅前金額（未扣 30% 預扣稅）
        {incomplete && "；部分代號抓不到配息"}。
      </p>

      <ul className="mt-3 divide-y divide-gray-950/5 dark:divide-white/5">
        {months.map((m, index) => {
          const pct = max > 0 ? (m.totalTwd / max) * 100 : 0;
          const empty = m.items.length === 0;
          return (
            <li key={m.month}>
              <details
                open={!empty && index < DEFAULT_OPEN_MONTHS}
                className="group"
              >
                <summary
                  className={`grid cursor-pointer list-none grid-cols-[4rem_1fr_6.5rem] items-center gap-3 py-2 [&::-webkit-details-marker]:hidden ${
                    empty ? "pointer-events-none" : ""
                  }`}
                >
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {monthLabel(m.month)}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-gray-950/[0.04] dark:bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gray-950 dark:bg-white"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span
                    className={`sensitive text-right text-sm ${
                      empty
                        ? "text-gray-400 dark:text-gray-500"
                        : "font-medium text-gray-950 dark:text-gray-50"
                    }`}
                  >
                    {empty ? "—" : ntd(m.totalTwd)}
                    {!empty && (
                      <span className="ml-1 inline-block text-xs text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500">
                        ›
                      </span>
                    )}
                  </span>
                </summary>
                {!empty && (
                  <ul className="mb-2 space-y-1 rounded-xl bg-gray-950/[0.025] dark:bg-white/[0.03] px-3 py-2">
                    {m.items.map((item) => (
                      <li
                        key={`${item.symbol}-${item.exDate}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="min-w-0 flex-1 truncate text-gray-950 dark:text-gray-50">
                          {item.name || item.symbol}
                          <span className="ml-1 font-mono text-gray-400 dark:text-gray-500">
                            {item.symbol}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-gray-400 dark:text-gray-500 sm:inline">
                          {item.projected ? "預估除息" : "已除息"} {shortDate(item.exDate)} · 約{" "}
                          {shortDate(item.payDate)} 入帳
                        </span>
                        <span className="sm:hidden shrink-0 text-gray-400 dark:text-gray-500">
                          約 {shortDate(item.payDate)}
                        </span>
                        <span className="sensitive hidden w-24 shrink-0 text-right text-gray-600 dark:text-gray-400 sm:inline">
                          {item.perShare.toFixed(2)}
                          {item.market === "US" ? " USD" : " 元"}
                        </span>
                        <span className="sensitive w-20 shrink-0 text-right font-medium text-gray-950 dark:text-gray-50">
                          {ntd(item.amountTwd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
