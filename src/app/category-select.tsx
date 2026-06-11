"use client";

import { useTransition } from "react";
import { updateExpenseCategory } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";

export function CategorySelect({ id, value }: { id: number; value: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={(event) => {
        const category = event.target.value;
        startTransition(() => updateExpenseCategory(id, category));
      }}
      onClick={(event) => event.stopPropagation()}
      className="rounded-lg bg-gray-950/[0.025] px-2 py-1.5 text-base text-gray-600 ring-1 ring-inset ring-gray-950/5 focus:outline-none focus:ring-2 focus:ring-gray-950 disabled:opacity-50 sm:py-1 sm:text-xs"
    >
      {CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
