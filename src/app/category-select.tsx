"use client";

import { useTransition } from "react";
import { updateExpenseCategory } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";

export function CategorySelect({
  id,
  value,
  action,
  options,
}: {
  id: number;
  value: string;
  action?: (id: number, category: string) => Promise<void>;
  options?: readonly string[];
}) {
  const [isPending, startTransition] = useTransition();
  const run = action ?? updateExpenseCategory;
  const list = options ?? CATEGORIES;

  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={(event) => {
        const category = event.target.value;
        startTransition(() => run(id, category));
      }}
      onClick={(event) => event.stopPropagation()}
      className="rounded-lg bg-gray-950/[0.025] dark:bg-white/[0.025] px-2 py-1.5 text-base text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-950/5 dark:ring-white/5 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white disabled:opacity-50 sm:py-1 sm:text-xs"
    >
      {list.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
