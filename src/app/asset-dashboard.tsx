import type { AssetSummary } from "@/lib/asset-dashboard";

const MARKET_LABEL: Record<string, string> = { TW: "台股", US: "美股" };
const MARKET_BAR: Record<string, string> = {
  TW: "bg-red-500",
  US: "bg-blue-500",
};

function ntd(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function usd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CARD =
  "rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10";

/** 水平長條圖：條長以最大值為 100%，顏色依市場 */
function BarList({
  items,
}: {
  items: { key: string; label: string; market: string; value: number; tip: string }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">沒有持股資料</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li
          key={item.key}
          title={item.tip}
          className="grid grid-cols-[7rem_1fr] items-center gap-2 text-xs"
        >
          <span className="truncate text-gray-600 dark:text-gray-400">{item.label}</span>
          <span className="sensitive flex min-w-0 items-center gap-2">
            <span
              className={`h-4 shrink-0 rounded ${MARKET_BAR[item.market] ?? "bg-gray-400"}`}
              style={{ width: `max(2px, ${(item.value / max) * 70}%)` }}
            />
            <span className="whitespace-nowrap tabular-nums text-gray-950 dark:text-gray-50">
              {ntd(item.value)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 重點摘要句：淨資產、負債比、最大持股與占比 */
export function AssetTakeaway({
  summary,
  totalAssets,
  totalLiabilities,
  netWorth,
}: {
  summary: AssetSummary;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}) {
  const top = summary.bySymbol[0];
  const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : null;
  // 最大持股占「總資產」，與試算表摘要口徑一致
  const topShare = top && totalAssets > 0 ? top.valueTwd / totalAssets : null;

  return (
    <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400">
      淨資產{" "}
      <b className="sensitive font-semibold text-gray-950 dark:text-gray-50">{ntd(netWorth)}</b>
      ，負債比{" "}
      <b className="sensitive font-semibold text-gray-950 dark:text-gray-50">
        {debtRatio === null ? "—" : pct(debtRatio)}
      </b>
      。
      {top && (
        <>
          最大持股是{" "}
          <b className="font-semibold text-gray-950 dark:text-gray-50">
            {top.name ? `${top.name}（${top.symbol}）` : top.symbol}
          </b>
          ，占總資產{" "}
          <b className="sensitive font-semibold text-gray-950 dark:text-gray-50">
            {topShare === null ? "—" : pct(topShare)}
          </b>
          。
        </>
      )}
    </p>
  );
}

/** 資產頁儀表板：台美股配置、各持股與各券商市值 */
export function AssetDashboard({ summary }: { summary: AssetSummary }) {
  return (
    <>
      <section className={`mt-3 ${CARD}`}>
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">台股與美股配置</h2>
        <div className="sensitive mt-3 flex h-3 gap-0.5" role="img" aria-label="台股與美股占持股總市值的比例">
          {summary.marketSplit
            .filter((m) => m.share > 0)
            .map((m) => (
              <div
                key={m.market}
                className={`rounded-full ${MARKET_BAR[m.market]}`}
                style={{ width: `${m.share * 100}%` }}
              />
            ))}
        </div>
        <div className="sensitive mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
          {summary.marketSplit.map((m) => (
            <span key={m.market} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${MARKET_BAR[m.market]}`} />
              {MARKET_LABEL[m.market]} {pct(m.share)}，{ntd(m.valueTwd)}
              {m.market === "US" && summary.usTotalUsd > 0 && `（${usd(summary.usTotalUsd)}）`}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section className={CARD}>
          <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">各持股市值</h2>
          <BarList
            items={summary.bySymbol.map((s) => ({
              key: s.symbol,
              label: s.name || s.symbol,
              market: s.market,
              value: s.valueTwd,
              tip: `${s.name ? `${s.name}（${s.symbol}）` : s.symbol}：${ntd(s.valueTwd)}，占持股 ${pct(s.share)}`,
            }))}
          />
        </section>
        <section className={CARD}>
          <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">各券商市值</h2>
          <BarList
            items={summary.byBroker.map((b) => ({
              key: `${b.broker}|${b.market}`,
              label: `${b.broker} ${MARKET_LABEL[b.market] ?? b.market}`,
              market: b.market,
              value: b.valueTwd,
              tip: `${b.broker} ${MARKET_LABEL[b.market] ?? b.market}：${ntd(b.valueTwd)}${
                b.valueUsd !== null ? `（${usd(b.valueUsd)}）` : ""
              }`,
            }))}
          />
        </section>
      </div>
    </>
  );
}
