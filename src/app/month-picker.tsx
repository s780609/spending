"use client";

import { useRouter } from "next/navigation";

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const SELECT_CLS =
  "rounded-lg bg-white px-2 py-1 text-lg font-bold tracking-tight text-gray-950 ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950";

export function MonthPicker({
  month,
  basePath = "/",
}: {
  month: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [year, monthPart] = month.split("-");

  // 2020 ～ 明年；若目前檢視年份超出範圍也納入選項
  const currentYear = new Date().getFullYear();
  const years = new Set<number>();
  for (let y = currentYear + 1; y >= 2020; y--) {
    years.add(y);
  }
  years.add(Number(year));
  const yearOptions = [...years].sort((a, b) => b - a);

  const go = (y: string, m: string) => {
    router.push(`${basePath}?month=${y}-${m}`);
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={year}
        onChange={(event) => go(event.target.value, monthPart)}
        className={SELECT_CLS}
        aria-label="選擇年份"
      >
        {yearOptions.map((y) => (
          <option key={y} value={String(y)}>
            {y} 年
          </option>
        ))}
      </select>
      <select
        value={monthPart}
        onChange={(event) => go(year, event.target.value)}
        className={SELECT_CLS}
        aria-label="選擇月份"
      >
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {Number(m)} 月
          </option>
        ))}
      </select>
    </div>
  );
}
