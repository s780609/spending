"use client";

import { useRouter } from "next/navigation";

export function MonthPicker({
  month,
  basePath = "/",
}: {
  month: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <input
      type="month"
      value={month}
      onChange={(event) => {
        if (event.target.value) {
          router.push(`${basePath}?month=${event.target.value}`);
        }
      }}
      className="rounded-lg bg-white px-2 py-1 text-lg font-bold tracking-tight text-gray-950 ring-1 ring-inset ring-gray-950/10 focus:outline-none focus:ring-2 focus:ring-gray-950"
      aria-label="選擇月份"
    />
  );
}
