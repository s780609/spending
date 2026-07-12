import {
  addMaintenanceRecord,
  deleteMaintenanceRecord,
  saveBikeSettings,
} from "@/app/actions";
import { DeleteButton } from "@/app/delete-button";
import { type DueItem, MaintenanceAlert } from "@/app/maintenance-alert";
import { todayTaipei } from "@/lib/dates";
import {
  ENGINE_OIL_KEY,
  MAINTENANCE_ITEMS,
  type MaintenanceStatus,
} from "@/lib/maintenance";
import { getMaintenanceData } from "@/lib/maintenance-query";

// 每次請求都讀最新紀錄，避免建置時打 DB 產生靜態快照
export const dynamic = "force-dynamic";

const NAME_BY_KEY = new Map(MAINTENANCE_ITEMS.map((i) => [i.key, i.name]));
const GROUP_LABEL: Record<MaintenanceStatus["group"], string> = {
  routine: "① 每年／定期里程",
  major: "② 每兩年以上／大保養",
};

function fmtNum(value: number): string {
  return Math.round(value).toLocaleString("zh-TW");
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

/** 未到期但里程剩 ≤500km 或時間剩 ≤30 天 */
function isSoon(s: MaintenanceStatus): boolean {
  if (s.due) return false;
  return (
    (s.kmRemaining != null && s.kmRemaining <= 500) ||
    (s.daysRemaining != null && s.daysRemaining <= 30)
  );
}

export default async function MotorcyclePage() {
  const today = todayTaipei();
  const { status, records, settings, estMileage } =
    await getMaintenanceData(today);

  const dueItems: DueItem[] = status
    .filter((s) => s.due)
    .map((s) => ({
      key: s.key,
      name: s.name,
      action: s.inspectOnly ? "檢查" : "更換",
      detail: dueDetail(s),
    }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-24 sm:pb-8">
      <MaintenanceAlert dueItems={dueItems} today={today} />

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50">
        機車保養
      </h1>
      <p className="mt-1 max-w-[60ch] text-sm leading-7 text-gray-600 dark:text-gray-400 text-pretty">
        以 YAMAHA SMAX 155 原廠保養表為準，里程以手動輸入的「目前里程」為準，依
        「里程或時間先到為準」判斷各項目是否到期；切到本頁時若有到期項目會跳出提醒。
      </p>

      {/* 目前里程 + 校正 */}
      <div className="mt-6 rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">目前里程</div>
            <div className="text-3xl font-bold tracking-tight text-gray-950 dark:text-gray-50 tabular-nums">
              {fmtNum(estMileage)}
              <span className="ml-1 text-base font-medium text-gray-400 dark:text-gray-500">km</span>
            </div>
            <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              以下方輸入的「目前里程」為準
            </div>
          </div>
        </div>
        <form
          action={saveBikeSettings}
          className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-950/5 dark:border-white/5 pt-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="col-span-2 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 sm:col-span-1">
            起算日（出廠年月）
            <input
              type="month"
              name="startMonth"
              defaultValue={settings.startDate?.slice(0, 7) ?? ""}
              className="rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:text-sm"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 sm:col-span-1">
            目前里程（留空＝不更動）
            <input
              type="number"
              name="currentMileage"
              min={0}
              step="any"
              placeholder={`目前約 ${fmtNum(estMileage)}`}
              className="rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:text-sm"
            />
          </label>
          <button
            type="submit"
            className="col-span-2 self-end rounded-full bg-gray-950 dark:bg-white px-4 py-2.5 text-base font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900 sm:col-span-1 sm:py-2 sm:text-sm"
          >
            儲存
          </button>
        </form>
      </div>

      {/* 新增保養紀錄 */}
      <form
        action={addMaintenanceRecord}
        className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10 sm:grid-cols-[1fr_10rem_auto]"
      >
        <select
          name="itemKey"
          defaultValue={ENGINE_OIL_KEY}
          className="order-1 col-span-2 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:order-none sm:col-span-1 sm:text-sm"
        >
          {(["routine", "major"] as const).map((group) => (
            <optgroup key={group} label={GROUP_LABEL[group]}>
              {MAINTENANCE_ITEMS.filter((i) => i.group === group).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input
          type="date"
          name="date"
          defaultValue={today}
          required
          className="order-2 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:order-none sm:text-sm"
        />
        <input
          type="text"
          name="note"
          placeholder="備註（選填）"
          className="order-4 col-span-2 rounded-lg px-3 py-2 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white sm:order-none sm:col-span-1 sm:text-sm"
        />
        <button
          type="submit"
          className="order-3 rounded-full bg-gray-950 dark:bg-white px-4 py-2.5 text-base font-medium text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100 dark:hover:text-gray-900 sm:order-none sm:py-2 sm:text-sm"
        >
          記一筆
        </button>
      </form>

      {/* 各項目到期狀態 */}
      {(["routine", "major"] as const).map((group) => (
        <section key={group} className="mt-8">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {GROUP_LABEL[group]}
          </h2>
          <ul className="mt-3 space-y-2">
            {status
              .filter((s) => s.group === group)
              .map((s) => {
                const due = s.due;
                const soon = isSoon(s);
                const ring = due
                  ? "ring-red-500/30"
                  : soon
                    ? "ring-amber-500/30"
                    : "ring-gray-950/10 dark:ring-white/10";
                const badge = due
                  ? {
                      text: s.inspectOnly ? "該檢查" : "該更換",
                      cls: "bg-red-500/10 text-red-700 ring-red-500/20 dark:ring-red-400/30",
                    }
                  : soon
                    ? {
                        text: "快到了",
                        cls: "bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 ring-amber-500/20 dark:ring-amber-400/30",
                      }
                    : {
                        text: "正常",
                        cls: "bg-gray-950/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 ring-gray-950/5 dark:ring-white/5",
                      };
                return (
                  <li
                    key={s.key}
                    className={`rounded-xl bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ${ring}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-950 dark:text-gray-50">
                        {s.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-4">
                      <span>間隔：{intervalText(s)}</span>
                      <span>上次：{lastText(s)}</span>
                      <span>下次：{nextText(s)}</span>
                      <span
                        className={
                          due
                            ? "font-medium text-red-600"
                            : soon
                              ? "font-medium text-amber-600"
                              : ""
                        }
                      >
                        {remainingText(s)}
                      </span>
                    </div>
                    {s.note && (
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{s.note}</p>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      {/* 近期保養紀錄 */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">保養紀錄</h2>
        {records.length === 0 ? (
          <p className="mt-3 text-center text-sm leading-7 text-gray-600 dark:text-gray-400">
            還沒有任何保養紀錄，先記一筆換機油吧。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-900 px-4 py-3 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-gray-500 dark:text-gray-400">
                  {r.date}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-950 dark:text-gray-50">
                    {NAME_BY_KEY.get(r.itemKey) ?? r.itemKey}
                  </span>
                  {r.note && (
                    <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                      {r.note}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {fmtNum(r.mileage)} km
                </span>
                <DeleteButton
                  id={r.id}
                  action={deleteMaintenanceRecord}
                  message="確定刪除這筆保養紀錄？"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
