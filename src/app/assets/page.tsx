import { asc } from "drizzle-orm";
import { addHolding, addLoan, deleteHolding, deleteLoan } from "@/app/actions";
import { AssetPie, NetWorthChart } from "@/app/asset-charts";
import { DeleteButton } from "@/app/delete-button";
import { Nav } from "@/app/nav";
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

export default async function AssetsPage() {
  // 開頁同時計算資產負債並補記今日快照
  const sheet = await recordDailySnapshot();
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
      <Nav />
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
        <h2 className="mt-8 text-lg font-bold tracking-tight text-gray-950">
          持股
        </h2>
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

        {sheet.holdings.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sheet.holdings.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs ring-1 ring-inset ${
                    h.market === "TW"
                      ? "bg-red-50 text-red-700 ring-red-600/20"
                      : "bg-blue-50 text-blue-700 ring-blue-600/20"
                  }`}
                >
                  {h.market === "TW" ? "台" : "美"}
                </span>
                <span className="min-w-0 flex-1">
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
                <SharesEditor id={h.id} shares={h.shares} />
                <span className="w-28 shrink-0 text-right text-sm font-medium text-gray-950">
                  {ntd(h.valueTwd)}
                </span>
                <DeleteButton
                  id={h.id}
                  action={deleteHolding}
                  message="確定刪除這筆持股？"
                />
              </li>
            ))}
          </ul>
        )}

        {/* ===== 負債：貸款 ===== */}
        <h2 className="mt-8 text-lg font-bold tracking-tight text-gray-950">
          負債
        </h2>
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
          <button
            type="submit"
            className="col-span-2 rounded-full bg-gray-950 px-4 py-2.5 text-base font-medium text-white hover:bg-gray-800 sm:col-span-1 sm:py-2 sm:text-sm"
          >
            新增貸款
          </button>
        </form>

        {sheet.loans.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sheet.loans.map((loan) => (
              <li
                key={loan.id}
                className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-950/10"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${
                      loan.type === "信貸"
                        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                        : "bg-violet-50 text-violet-700 ring-violet-600/20"
                    }`}
                  >
                    {loan.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-950">
                    {loan.name}
                  </span>
                  <span className="shrink-0 text-right text-sm font-medium text-gray-950">
                    {ntd(loan.liability)}
                  </span>
                  <DeleteButton
                    id={loan.id}
                    action={deleteLoan}
                    message="確定刪除這筆貸款？"
                  />
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
