import { asc } from "drizzle-orm";
import Link from "next/link";
import { addHolding, addLoan, deleteHolding, deleteLoan } from "@/app/actions";
import { AddPanel } from "@/app/add-panel";
import { AssetPie, NetWorthChart } from "@/app/asset-charts";
import { DeleteButton } from "@/app/delete-button";
import { SharesEditor } from "@/app/shares-editor";
import { getDb } from "@/db";
import { networthSnapshots } from "@/db/schema";
import { recordDailySnapshot } from "@/lib/balance-sheet";

export const dynamic = "force-dynamic";

function ntd(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString("zh-TW")}`;
}

const INPUT_CLS =
  "rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950 sm:text-sm";

const PILL_ACTIVE =
  "rounded-full bg-gray-950 px-2.5 py-1 text-xs font-medium text-white";
const PILL_IDLE =
  "rounded-full px-2.5 py-1 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/10 hover:bg-gray-950/5";

function assetHref(broker?: string, symbol?: string, sort?: string): string {
  const params = new URLSearchParams();
  if (broker) params.set("broker", broker);
  if (symbol) params.set("symbol", symbol);
  if (sort) params.set("sort", sort);
  const query = params.toString();
  return query ? `/assets?${query}` : "/assets";
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ broker?: string; symbol?: string; sort?: string }>;
}) {
  const {
    broker: brokerParam,
    symbol: symbolParam,
    sort: sortParam,
  } = await searchParams;
  const sort = sortParam === "value" ? "value" : undefined;

  // 開頁同時計算資產負債並補記今日快照
  const sheet = await recordDailySnapshot();

  const brokers = [...new Set(sheet.holdings.map((h) => h.broker))];
  const brokerFilter =
    brokerParam && brokers.includes(brokerParam) ? brokerParam : undefined;
  // 代號選項只列目前券商範圍內的，換券商時不相容的代號篩選自動失效
  const brokerScoped = brokerFilter
    ? sheet.holdings.filter((h) => h.broker === brokerFilter)
    : sheet.holdings;
  const symbols = [...new Set(brokerScoped.map((h) => h.symbol))];
  const symbolFilter =
    symbolParam && symbols.includes(symbolParam) ? symbolParam : undefined;
  const filteredHoldings = symbolFilter
    ? brokerScoped.filter((h) => h.symbol === symbolFilter)
    : brokerScoped;
  // 預設排序（市場、組內市值）由 computeBalanceSheet 給；選「市值」時不分市場重排
  const visibleHoldings =
    sort === "value"
      ? [...filteredHoldings].sort((a, b) => b.valueTwd - a.valueTwd)
      : filteredHoldings;
  const visibleValue = visibleHoldings.reduce((sum, h) => sum + h.valueTwd, 0);
  const snapshots = await getDb()
    .select()
    .from(networthSnapshots)
    .orderBy(asc(networthSnapshots.date));

  const chartData = snapshots.map((row) => ({
    date: row.date.slice(5),
    netWorth: Number(row.netWorth),
    leverage: row.leverage === null ? null : Number(row.leverage),
  }));

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            資產負債表
          </h1>
          <p className="text-xs text-gray-400">
            美金匯率 {sheet.usdTwd ? sheet.usdTwd.toFixed(2) : "—"}
            {sheet.fxStale && "（快取）"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "總資產", value: ntd(sheet.totalAssets) },
            { label: "總負債", value: ntd(sheet.totalLiabilities) },
            { label: "淨資產", value: ntd(sheet.netWorth) },
            {
              label: "槓桿比率",
              value: sheet.leverage === null ? "—" : sheet.leverage.toFixed(2),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10"
            >
              <p className="text-xs text-gray-600">{card.label}</p>
              <p className="mt-1 text-lg font-bold tracking-tight text-gray-950">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
            <h2 className="text-sm font-medium text-gray-950">持股佔比</h2>
            <AssetPie
              data={sheet.holdings.map((h) => ({
                symbol: h.symbol,
                name: h.name,
                market: h.market,
                valueTwd: h.valueTwd,
              }))}
            />
          </section>
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10">
            <h2 className="text-sm font-medium text-gray-950">
              淨資產與槓桿走勢
            </h2>
            <NetWorthChart data={chartData} />
          </section>
        </div>

        {/* ===== 資產：持股 ===== */}
        <AddPanel title="持股" buttonLabel="新增持股">
        <form
          action={addHolding}
          className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10 sm:grid-cols-[6rem_1fr_8rem_8rem]"
        >
          <select name="market" className={INPUT_CLS}>
            <option value="TW">台股</option>
            <option value="US">美股</option>
          </select>
          <input
            type="text"
            name="broker"
            placeholder="券商戶頭（如：富邦）"
            required
            className={INPUT_CLS}
          />
          <input
            type="text"
            name="symbol"
            placeholder="代號（2330 / AAPL）"
            required
            className={INPUT_CLS}
          />
          <input
            type="number"
            name="shares"
            placeholder="股數"
            step="any"
            min={0}
            required
            className={INPUT_CLS}
          />
          <input
            type="text"
            name="name"
            placeholder="顯示名稱（選填，如：台積電）"
            className={`${INPUT_CLS} col-span-2 sm:col-span-3`}
          />
          <button
            type="submit"
            className="col-span-2 rounded-full bg-gray-950 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-800 sm:col-span-1 sm:py-2 sm:text-sm"
          >
            新增持股
          </button>
        </form>
        </AddPanel>

        {sheet.holdings.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="w-8 text-xs text-gray-400">券商</span>
              <Link
                href={assetHref(undefined, symbolFilter, sort)}
                className={!brokerFilter ? PILL_ACTIVE : PILL_IDLE}
              >
                全部
              </Link>
              {brokers.map((broker) => (
                <Link
                  key={broker}
                  href={assetHref(
                    brokerFilter === broker ? undefined : broker,
                    symbolFilter,
                    sort,
                  )}
                  className={brokerFilter === broker ? PILL_ACTIVE : PILL_IDLE}
                >
                  {broker}
                </Link>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="w-8 text-xs text-gray-400">代號</span>
              <Link
                href={assetHref(brokerFilter, undefined, sort)}
                className={!symbolFilter ? PILL_ACTIVE : PILL_IDLE}
              >
                全部
              </Link>
              {symbols.map((symbol) => (
                <Link
                  key={symbol}
                  href={assetHref(
                    brokerFilter,
                    symbolFilter === symbol ? undefined : symbol,
                    sort,
                  )}
                  className={`font-mono ${
                    symbolFilter === symbol ? PILL_ACTIVE : PILL_IDLE
                  }`}
                >
                  {symbol}
                </Link>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="w-8 text-xs text-gray-400">排序</span>
              <Link
                href={assetHref(brokerFilter, symbolFilter)}
                className={!sort ? PILL_ACTIVE : PILL_IDLE}
              >
                市場
              </Link>
              <Link
                href={assetHref(brokerFilter, symbolFilter, "value")}
                className={sort === "value" ? PILL_ACTIVE : PILL_IDLE}
              >
                市值
              </Link>
            </div>
            {(brokerFilter || symbolFilter) && visibleHoldings.length > 0 && (
              <p className="mt-3 text-xs text-gray-600">
                篩選結果：{visibleHoldings.length} 筆，市值{" "}
                <span className="font-medium text-gray-950">
                  {ntd(visibleValue)}
                </span>
              </p>
            )}
          </>
        )}

        {visibleHoldings.length > 0 && (
          <ul className="mt-3 space-y-2">
            {visibleHoldings.map((h) => (
              <li
                key={h.id}
                className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  {/* 手機第一行：市場＋名稱；桌面攤平成單行（sm:contents + order） */}
                  <div className="flex min-w-0 items-center gap-3 sm:contents">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs ring-1 ring-inset sm:order-1 ${
                        h.market === "TW"
                          ? "bg-red-50 text-red-700 ring-red-600/20"
                          : "bg-blue-50 text-blue-700 ring-blue-600/20"
                      }`}
                    >
                      {h.market === "TW" ? "台" : "美"}
                    </span>
                    <span className="min-w-0 flex-1 sm:order-2">
                      <span className="block truncate text-sm text-gray-950">
                        {h.name || h.symbol}
                        <span className="ml-1 font-mono text-xs text-gray-400">
                          {h.symbol}
                        </span>
                      </span>
                      <span className="block text-xs text-gray-400">
                        {h.broker} · 現價 {h.price.toLocaleString("zh-TW")}
                        {h.market === "US" && " USD"}
                        {h.priceStale && "（快取）"}
                      </span>
                    </span>
                  </div>
                  {/* 手機第二行：股數＋市值＋刪除 */}
                  <div className="flex items-center gap-2 sm:contents">
                    <span className="flex items-center gap-1.5 sm:order-3">
                      <span className="text-xs text-gray-400 sm:hidden">
                        股數
                      </span>
                      <SharesEditor id={h.id} shares={h.shares} />
                    </span>
                    <span className="ml-auto shrink-0 text-right text-base font-semibold text-gray-950 sm:order-4 sm:ml-0 sm:w-28 sm:text-sm sm:font-medium">
                      {ntd(h.valueTwd)}
                    </span>
                    <span className="sm:order-5">
                      <DeleteButton
                        id={h.id}
                        action={deleteHolding}
                        message={`確定刪除「${h.broker} ${
                          h.name ? `${h.name}（${h.symbol}）` : h.symbol
                        }」這筆持股？`}
                      />
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ===== 負債：貸款 ===== */}
        <AddPanel title="負債" buttonLabel="新增貸款">
        <form
          action={addLoan}
          className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-950/10 sm:grid-cols-3"
        >
          <input
            type="text"
            name="name"
            placeholder="貸款名稱"
            required
            className={`${INPUT_CLS} col-span-2 sm:col-span-1`}
          />
          <select name="type" className={INPUT_CLS}>
            <option value="質押">質押</option>
            <option value="信貸">信貸</option>
          </select>
          <input
            type="number"
            name="principal"
            placeholder="貸款金額"
            step="any"
            min={0}
            required
            className={INPUT_CLS}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            年利率
            <input
              type="number"
              name="annualRate"
              placeholder="%"
              step="any"
              min={0}
              required
              className={`${INPUT_CLS} w-20`}
            />
            %
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            借貸日
            <input
              type="date"
              name="startDate"
              required
              className={`${INPUT_CLS} flex-1`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            期數
            <input
              type="number"
              name="installments"
              placeholder="信貸用"
              min={1}
              className={`${INPUT_CLS} w-20`}
            />
            月
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
            期限
            <input type="date" name="termEnd" className={`${INPUT_CLS} flex-1`} />
            <span className="text-xs text-gray-400">質押用（選填）</span>
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600 sm:col-span-3">
            擔保
            <input
              type="text"
              name="collateralSymbol"
              placeholder="代號（2330）"
              className={`${INPUT_CLS} w-32`}
            />
            <input
              type="number"
              name="collateralShares"
              placeholder="股數"
              step="any"
              min={0}
              className={`${INPUT_CLS} w-28`}
            />
            <span className="text-xs text-gray-400">質押用，填了會算維持率</span>
          </label>
          <button
            type="submit"
            className="col-span-2 rounded-full bg-gray-950 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-800 sm:col-span-1 sm:py-2 sm:text-sm"
          >
            新增貸款
          </button>
        </form>
        </AddPanel>

        {sheet.loans.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sheet.loans.map((loan) => (
              <li
                key={loan.id}
                className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  {/* 手機第一行：類型＋名稱；桌面攤平成單行 */}
                  <div className="flex min-w-0 items-center gap-3 sm:contents">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset sm:order-1 ${
                        loan.type === "信貸"
                          ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                          : "bg-violet-50 text-violet-700 ring-violet-600/20"
                      }`}
                    >
                      {loan.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-950 sm:order-2">
                      {loan.name}
                    </span>
                  </div>
                  {/* 手機第二行：餘額＋刪除 */}
                  <div className="flex items-center gap-3 sm:contents">
                    <span className="shrink-0 text-base font-semibold text-gray-950 sm:order-3 sm:text-right sm:text-sm sm:font-medium">
                      {ntd(loan.liability)}
                    </span>
                    <span className="ml-auto sm:order-4 sm:ml-0">
                      <DeleteButton
                        id={loan.id}
                        action={deleteLoan}
                        message={`確定刪除「${loan.name}」這筆貸款？`}
                      />
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  本金 {ntd(loan.principal)} · 年利率 {loan.annualRate}% ·{" "}
                  {loan.startDate} 起
                  {loan.type === "信貸" && loan.installments !== null && (
                    <>
                      {" "}
                      · {loan.paymentsMade}/{loan.installments} 期 · 月付{" "}
                      {ntd(loan.monthlyPayment ?? 0)} · 已付利息{" "}
                      {ntd(loan.interest)}
                    </>
                  )}
                  {loan.type === "質押" && (
                    <>
                      {" "}
                      · 累計利息 {ntd(loan.interest)}
                      {loan.termEnd && ` · 期限至 ${loan.termEnd}`}
                      {loan.collateralSymbol && loan.collateralShares !== null && (
                        <>
                          {" "}
                          · 擔保 {loan.collateralSymbol} ×
                          {loan.collateralShares.toLocaleString("zh-TW")}
                          {loan.collateralValue !== null && (
                            <> 市值 {ntd(loan.collateralValue)}</>
                          )}
                          {loan.maintenanceRatio !== null && (
                            <>
                              {" "}
                              · 維持率{" "}
                              <span
                                className={
                                  loan.maintenanceRatio < 130
                                    ? "font-semibold text-red-600"
                                    : loan.maintenanceRatio < 167
                                      ? "font-semibold text-amber-600"
                                      : "font-medium text-green-600"
                                }
                              >
                                {Math.round(loan.maintenanceRatio)}%
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
