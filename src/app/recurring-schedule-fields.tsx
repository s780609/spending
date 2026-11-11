"use client";

import { useState } from "react";
import { INTERVAL_MONTHS, type RecurringFrequency } from "@/lib/recurring";

export function RecurringScheduleFields({ inputClassName }: { inputClassName: string }) {
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const isYearly = frequency === "yearly";
  const isInterval = frequency === "interval";
  const needsMonth = isYearly || isInterval;

  return (
    <>
      <select
        name="frequency"
        value={frequency}
        onChange={(event) => {
          const nextFrequency = event.target.value;
          if (
            nextFrequency === "monthly" ||
            nextFrequency === "yearly" ||
            nextFrequency === "interval"
          ) {
            setFrequency(nextFrequency);
          }
        }}
        className={inputClassName}
      >
        <option value="monthly">每月</option>
        <option value="interval">每 N 個月</option>
        <option value="yearly">每年</option>
      </select>
      {isInterval && (
        <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          每
          <select
            name="intervalMonths"
            defaultValue={2}
            required
            className={inputClassName}
          >
            {INTERVAL_MONTHS.map((months) => (
              <option key={months} value={months}>
                {months}
              </option>
            ))}
          </select>
          個月
        </label>
      )}
      <div
        aria-hidden={!needsMonth}
        className={`grid overflow-hidden transition-[grid-template-columns,opacity] duration-200 ease-out ${
          needsMonth ? "grid-cols-[5.5rem] opacity-100" : "grid-cols-[0rem] opacity-0"
        }`}
      >
        <label className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-gray-600 dark:text-gray-400">
          <input
            type="number"
            name="monthOfYear"
            min={1}
            max={12}
            defaultValue={1}
            disabled={!needsMonth}
            required={needsMonth}
            className={`${inputClassName} w-16`}
          />
          月
        </label>
      </div>
      <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="number"
          name="dayOfMonth"
          min={1}
          max={31}
          defaultValue={1}
          required
          className={`${inputClassName} w-16`}
        />
        號
      </label>
    </>
  );
}
