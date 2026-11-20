import {
  addMaintenanceRecord,
  deleteMaintenanceRecord,
  saveBikeSettings,
  updateBikeMileage,
} from "@/app/actions";
import { DeleteButton } from "@/app/delete-button";
import { type DueItem, MaintenanceAlert } from "@/app/maintenance-alert";
import { SubmitButton } from "@/app/submit-button";
import { todayTaipei } from "@/lib/dates";
import {
  diffDays,
  ENGINE_OIL_KEY,
  groupVisits,
  MAINTENANCE_ITEMS,
  MILEAGE_STALE_DAYS,
  type MaintenanceStatus,
  predictDueDate,
  sortByUrgency,
  type Urgency,
  urgencyOf,
  usedRatio,
} from "@/lib/maintenance";
import { getMaintenanceData } from "@/lib/maintenance-query";
import { CARD, ntd } from "@/lib/spending-stats";

// 每次請求都讀最新紀錄，避免建置時打 DB 產生靜態快照
export const dynamic = "force-dynamic";

const NAME_BY_KEY = new Map(MAINTENANCE_ITEMS.map((i) => [i.key, i.name]));
const GROUP_LABEL: Record<MaintenanceStatus["group"], string> = {
  routine: "每年／定期里程",
  major: "每兩年以上／大保養",
};

const INPUT =
  "rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:text-sm";
const PRIMARY_BUTTON =
  "rounded-full bg-gray-950 dark:bg-white px-4 py-2.5 text-base font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900 sm:py-2 sm:text-sm";

const URGENCY_STYLE: Record<
  Urgency,
  { ring: string; bar: string; text: string; badge: string }
> = {
  due: {
    ring: "ring-red-500/30",
    bar: "bg-red-500",
    text: "font-medium text-red-600 dark:text-red-400",
    badge: "bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20 dark:ring-red-400/30",
  },
  soon: {
    ring: "ring-amber-500/30",
    bar: "bg-amber-500",
    text: "font-medium text-amber-600 dark:text-amber-400",
    badge:
      "bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 ring-amber-500/20 dark:ring-amber-400/30",
  },
  ok: {
    ring: "ring-gray-950/10 dark:ring-white/10",
    bar: "bg-sky-500",
    text: "",
    badge:
      "bg-gray-950/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 ring-gray-950/5 dark:ring-white/5",
  },
};

function fmtNum(value: number): string {
  return Math.round(value).toLocaleString("zh-TW");
}

/** YYYY-MM-DD → M/D */
function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function intervalText(s: MaintenanceStatus): string {
  const parts: string[] = [];
  if (s.km != null) parts.push(`${fmtNum(s.km)} km`);
  if (s.months != null) parts.push(`${s.months} 個月`);
  return parts.length ? `每 ${parts.join(" 或 ")}` : "依磨耗";
}

function lastText(s: MaintenanceStatus): string {
  if (!s.lastDate) return "尚未紀錄";
  return s.lastMileage != null
    ? `${s.lastDate} · ${fmtNum(s.lastMileage)} km`
    : s.lastDate;
}

function nextText(s: MaintenanceStatus): string {
  const parts: string[] = [];
  if (s.dueMileage != null) parts.push(`${fmtNum(s.dueMileage)} km`);
  if (s.dueDate != null) parts.push(s.dueDate);
  return parts.length ? parts.join(" 或 ") : "—";
}

function remainingText(s: MaintenanceStatus): string {
  const parts: string[] = [];
  if (s.kmRemaining != null) {
    parts.push(
      s.kmRemaining > 0
        ? `剩 ${fmtNum(s.kmRemaining)} km`
        : `超出 ${fmtNum(-s.kmRemaining)} km`,
    );
  }
  if (s.daysRemaining != null) {
    parts.push(
      s.daysRemaining > 0 ? `剩 ${s.daysRemaining} 天` : `超期 ${-s.daysRemaining} 天`,
    );
  }
  return parts.join(" · ") || "—";
}

function dueDetail(s: MaintenanceStatus): string {
  const parts: string[] = [];
  if (s.dueByKm) {
    parts.push(
      s.kmRemaining != null && s.kmRemaining < 0
        ? `已超出 ${fmtNum(-s.kmRemaining)} km`
        : "已達里程",
    );
  }
  if (s.dueByTime) {
    parts.push(
      s.daysRemaining != null && s.daysRemaining < 0
        ? `已超期 ${-s.daysRemaining} 天`
        : "已達年限",
    );
  }
  return parts.join("、") || "已到保養時機";
}

/** 預估日已過（里程太久沒更新時常見）就改說「推估已到」 */
function predictedText(predicted: string, today: string): string {
  return predicted <= today ? "推估已到" : `約 ${shortDate(predicted)}`;
}

function badgeText(s: MaintenanceStatus): string {
  const urgency = urgencyOf(s);
  if (urgency === "due") return s.inspectOnly ? "該檢查" : "該更換";
  return urgency === "soon" ? "快到了" : "正常";
}

/** 單一保養項目卡：名稱＋狀態、間隔用量條、間隔／上次／下次／剩餘（含預估日） */
function ItemCard({
  s,
  predicted,
  today,
}: {
  s: MaintenanceStatus;
  predicted: string | null;
  today: string;
}) {
  const urgency = urgencyOf(s);
  const style = URGENCY_STYLE[urgency];
  const ratio = usedRatio(s);
  const fill = ratio === null ? 0 : Math.min(100, ratio * 100);
  return (
    <li className={`rounded-xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ${style.ring}`}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-950 dark:text-gray-50">
          {s.name}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
          {badgeText(s)}
        </span>
      </div>
      {ratio !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-1.5 flex-1 gap-0.5">
            {fill > 0 && <div className={`rounded-full ${style.bar}`} style={{ width: `${fill}%` }} />}
            {fill < 100 && <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700" />}
          </div>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-400 dark:text-gray-500">
            {ratio > 2 ? "200%+" : `${Math.round(ratio * 100)}%`}
          </span>
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-4">
        <span>間隔：{intervalText(s)}</span>
        <span>上次：{lastText(s)}</span>
        <span>下次：{nextText(s)}</span>
        <span className={style.text}>
          {remainingText(s)}
          {predicted && (
            <span className="font-normal text-gray-500 dark:text-gray-400">
              （{predictedText(predicted, today)}）
            </span>
          )}
        </span>
      </div>
      {s.note && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{s.note}</p>}
    </li>
  );
}

export default async function MotorcyclePage() {
  const today = todayTaipei();
  const { status, records, settings, estMileage, dailyKm, mileageAsOf } =
    await getMaintenanceData(today);

  const dueItems: DueItem[] = status
    .filter((s) => s.due)
    .map((s) => ({
      key: s.key,
      name: s.name,
      action: s.inspectOnly ? "檢查" : "更換",
      detail: dueDetail(s),
    }));

  const sorted = sortByUrgency(status);
  const predicted = new Map(
    status.map((s) => [s.key, predictDueDate(s, dailyKm, mileageAsOf)]),
  );
  const byUrgency = (u: Urgency) => sorted.filter((s) => urgencyOf(s) === u);
  const due = byUrgency("due");
  const soon = byUrgency("soon");
  const ok = byUrgency("ok");
  const next = sorted[0];

  const staleDays =
    settings.mileageUpdatedOn !== null ? diffDays(today, settings.mileageUpdatedOn) : null;
  const stale = staleDays !== null && staleDays > MILEAGE_STALE_DAYS;

  const year = today.slice(0, 4);
  const yearCost = records
    .filter((r) => r.date.startsWith(`${year}-`) && r.cost !== null)
    .reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const visits = groupVisits(records);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-24 sm:pb-8">
      <MaintenanceAlert dueItems={dueItems} today={today} />

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
        機車保養
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        YAMAHA SMAX 155 原廠保養表，里程或時間先到為準。
      </p>

      {/* ===== 主卡：目前里程＋到期概況 ===== */}
      <section className={`mt-4 ${CARD}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">目前里程</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-gray-950 dark:text-gray-50">
              {fmtNum(estMileage)}
              <span className="ml-1 text-base font-medium text-gray-400 dark:text-gray-500">km</span>
            </p>
          </div>
          <form action={updateBikeMileage} className="flex items-center gap-2">
            <input
              type="number"
              name="currentMileage"
              min={0}
              step="any"
              required
              placeholder="輸入新里程"
              aria-label="目前里程"
              className={`${INPUT} w-32`}
            />
            <SubmitButton pendingLabel="更新中" className={PRIMARY_BUTTON}>
              更新
            </SubmitButton>
          </form>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className={stale ? "font-medium text-amber-600 dark:text-amber-400" : ""}>
            {staleDays === null
              ? "尚未記錄更新日期"
              : staleDays === 0
                ? "今天更新"
                : `${staleDays} 天前更新（${settings.mileageUpdatedOn}）`}
          </span>
          {dailyKm !== null && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>平均每天約 {dailyKm.toFixed(1)} km</span>
            </>
          )}
          {yearCost > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>{year} 年保養花費 {ntd(yearCost)}</span>
            </>
          )}
        </p>
        {stale && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300 dark:ring-amber-400/30">
            里程已超過 {MILEAGE_STALE_DAYS} 天沒更新，下方到期判斷可能不準，請先更新目前里程。
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-950/5 pt-4 text-center dark:border-white/5">
          {[
            { label: "該處理", count: due.length, cls: "text-red-600 dark:text-red-400" },
            { label: "快到了", count: soon.length, cls: "text-amber-600 dark:text-amber-400" },
            { label: "正常", count: ok.length, cls: "text-gray-950 dark:text-gray-50" },
          ].map((c) => (
            <div key={c.label}>
              <p className={`text-xl font-bold tabular-nums ${c.count > 0 ? c.cls : "text-gray-300 dark:text-gray-600"}`}>
                {c.count}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
        {next && (
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            下一個：<span className="font-medium text-gray-950 dark:text-gray-50">{next.name}</span>{" "}
            <span className={URGENCY_STYLE[urgencyOf(next)].text}>
              {next.due ? dueDetail(next) : remainingText(next)}
            </span>
            {predicted.get(next.key) && `（${predictedText(predicted.get(next.key)!, today)}）`}
          </p>
        )}
      </section>

      {/* ===== 新增保養紀錄（可一次勾多項） ===== */}
      <form action={addMaintenanceRecord} className={`mt-3 ${CARD}`}>
        <h2 className="text-sm font-medium text-gray-950 dark:text-gray-50">記一筆保養</h2>
        {(["routine", "major"] as const).map((group) => (
          <fieldset key={group} className="mt-3">
            <legend className="text-xs text-gray-500 dark:text-gray-400">{GROUP_LABEL[group]}</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MAINTENANCE_ITEMS.filter((i) => i.group === group).map((item) => (
                <label
                  key={item.key}
                  className="cursor-pointer rounded-full px-2.5 py-1 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/10 hover:bg-gray-950/5 has-checked:bg-gray-950 has-checked:text-white has-checked:ring-gray-950 dark:text-gray-400 dark:ring-white/10 dark:hover:bg-white/5 dark:has-checked:bg-white dark:has-checked:text-gray-950 dark:has-checked:ring-white"
                >
                  <input
                    type="checkbox"
                    name="itemKey"
                    value={item.key}
                    defaultChecked={item.key === ENGINE_OIL_KEY}
                    className="sr-only"
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            日期
            <input type="date" name="date" defaultValue={today} required className={INPUT} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            當時里程（km）
            <input
              type="number"
              name="mileage"
              min={0}
              step="any"
              defaultValue={estMileage}
              required
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            花費（選填）
            <input type="number" name="cost" min={0} step="any" placeholder="NT$" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            備註（選填）
            <input type="text" name="note" placeholder="車行、品牌…" className={INPUT} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" name="createExpense" defaultChecked className="h-4 w-4 accent-gray-950 dark:accent-white" />
            有填花費時，同時記一筆記帳支出（交通）
          </label>
          <SubmitButton pendingLabel="記錄中" className={PRIMARY_BUTTON}>
            記一筆
          </SubmitButton>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          里程比目前里程大時會一併更新目前里程。補登舊紀錄請改成當時的日期與里程。
        </p>
      </form>

      {/* ===== 各項目：依急迫程度排序，正常的收合 ===== */}
      {due.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">該處理 · {due.length}</h2>
          <ul className="mt-3 space-y-2">
            {due.map((s) => (
              <ItemCard key={s.key} s={s} predicted={predicted.get(s.key) ?? null} today={today} />
            ))}
          </ul>
        </section>
      )}
      {soon.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">快到了 · {soon.length}</h2>
          <ul className="mt-3 space-y-2">
            {soon.map((s) => (
              <ItemCard key={s.key} s={s} predicted={predicted.get(s.key) ?? null} today={today} />
            ))}
          </ul>
        </section>
      )}
      {ok.length > 0 && (
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 [&::-webkit-details-marker]:hidden">
            <svg
              className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 5l6 5-6 5z" />
            </svg>
            正常 · {ok.length}
          </summary>
          <ul className="mt-3 space-y-2">
            {ok.map((s) => (
              <ItemCard key={s.key} s={s} predicted={predicted.get(s.key) ?? null} today={today} />
            ))}
          </ul>
        </details>
      )}

      {/* ===== 保養紀錄：同日同里程合成一次進廠 ===== */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">保養紀錄</h2>
        {visits.length === 0 ? (
          <p className="mt-3 text-center text-sm leading-7 text-gray-600 dark:text-gray-400">
            還沒有任何保養紀錄，先記一筆換機油吧。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visits.map((v) => (
              <li key={`${v.date}-${v.mileage}`} className={`${CARD} !p-0`}>
                <div className="flex items-center gap-3 border-b border-gray-950/5 px-4 py-2.5 text-xs text-gray-500 dark:border-white/5 dark:text-gray-400">
                  <span className="font-mono">{v.date}</span>
                  <span className="tabular-nums">{fmtNum(v.mileage)} km</span>
                  <span className="ml-auto font-medium tabular-nums text-gray-950 dark:text-gray-50">
                    {v.cost !== null ? ntd(v.cost) : ""}
                  </span>
                </div>
                <ul className="divide-y divide-gray-950/5 dark:divide-white/5">
                  {v.records.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-gray-950 dark:text-gray-50">
                          {NAME_BY_KEY.get(r.itemKey) ?? r.itemKey}
                        </span>
                        {r.note && (
                          <span className="block truncate text-xs text-gray-400 dark:text-gray-500">{r.note}</span>
                        )}
                      </span>
                      <DeleteButton
                        id={r.id}
                        action={deleteMaintenanceRecord}
                        message={
                          r.expenseId !== null
                            ? "確定刪除這筆保養紀錄？當初一併建立的記帳支出也會刪除。"
                            : "確定刪除這筆保養紀錄？"
                        }
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== 設定（很少改，收在最下面） ===== */}
      <details className="group mt-8">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 [&::-webkit-details-marker]:hidden">
          <svg
            className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M7 5l6 5-6 5z" />
          </svg>
          設定
        </summary>
        <form action={saveBikeSettings} className={`mt-3 flex flex-wrap items-end gap-3 ${CARD}`}>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            起算日（出廠年月）
            <input
              type="month"
              name="startMonth"
              defaultValue={settings.startDate?.slice(0, 7) ?? ""}
              className={INPUT}
            />
          </label>
          <SubmitButton pendingLabel="儲存中" className={PRIMARY_BUTTON}>
            儲存
          </SubmitButton>
          <p className="w-full text-xs text-gray-400 dark:text-gray-500">
            時間制項目（煞車油、電瓶等）尚未有紀錄時，從起算日開始計算。
          </p>
        </form>
      </details>
    </main>
  );
}
