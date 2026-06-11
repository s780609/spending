"use client";

import { useTransition } from "react";
import { deleteExpense } from "@/app/actions";

export function DeleteButton({
  id,
  action,
  message = "確定刪除這筆支出？",
}: {
  id: number;
  action?: (id: number) => Promise<void>;
  message?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const run = action ?? deleteExpense;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        if (confirm(message)) {
          startTransition(() => run(id));
        }
      }}
      className="rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-red-600 disabled:opacity-50 sm:py-1 sm:text-xs"
    >
      刪除
    </button>
  );
}
