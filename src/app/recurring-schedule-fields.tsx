"use client";

import { useState } from "react";

type Frequency = "monthly" | "yearly";

export function RecurringScheduleFields({ inputClassName }: { inputClassName: string }) {
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const isYearly = frequency === "yearly";

  return (
    <>
      <select
        name="frequency"
        value={frequency}
        onChange={(event) => {
          const nextFrequency = event.target.value;
          if (nextFrequency === "monthly" || nextFrequency === "yearly") {
            setFrequency(nextFrequency);
          }
        }}
        className={inputClassName}
      >
        <option value="monthly">每月</option>
        <option value="yearly">每年</option>
      </select>
      <div
        aria-hidden={!isYearly}
        className={`grid overflow-hidden transition-[grid-template-columns,opacity] duration-200 ease-out ${
          isYearly ? "grid-cols-[5.5rem] opacity-100" : "grid-cols-[0rem] opacity-0"
        }`}
      >
        <label className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-gray-600 dark:text-gray-400">
          <input
            type="number"
            name="monthOfYear"
            min={1}
            max={12}
            defaultValue={1}
            disabled={!isYearly}
            required={isYearly}
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
