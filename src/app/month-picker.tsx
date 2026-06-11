"use client";

import { useRouter } from "next/navigation";

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

function StyledSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <span className="relative inline-flex">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="appearance-none rounded-lg bg-white py-1.5 pl-3 pr-8 text-base font-semibold tracking-tight text-gray-950 shadow-sm ring-1 ring-gray-950/10 hover:bg-gray-950/[0.025] focus:outline-none focus:ring-2 focus:ring-gray-950"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

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
    <div className="flex items-center gap-1.5">
      <StyledSelect
        value={year}
        onChange={(y) => go(y, monthPart)}
        options={yearOptions.map((y) => ({
          value: String(y),
          label: `${y} 年`,
        }))}
        label="選擇年份"
      />
      <StyledSelect
        value={monthPart}
        onChange={(m) => go(year, m)}
        options={MONTHS.map((m) => ({
          value: m,
          label: `${Number(m)} 月`,
        }))}
        label="選擇月份"
      />
    </div>
  );
}
