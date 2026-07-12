"use client";

import { useTransition } from "react";
import { updateHoldingShares } from "@/app/actions";

export function SharesEditor({ id, shares }: { id: number; shares: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="number"
      defaultValue={shares}
      min={0}
      step="any"
      disabled={isPending}
      onBlur={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next > 0 && next !== shares) {
          startTransition(() => updateHoldingShares(id, next));
        }
      }}
      className="w-24 rounded-lg bg-gray-950/[0.025] dark:bg-white/[0.025] px-2 py-1 text-right text-base text-gray-950 dark:text-gray-50 ring-1 ring-inset ring-gray-950/5 dark:ring-white/5 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-white disabled:opacity-50 sm:text-sm"
      aria-label="股數"
    />
  );
}
