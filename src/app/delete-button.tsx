"use client";

import { useTransition } from "react";
import { deleteExpense } from "@/app/actions";

export function DeleteButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        if (confirm("確定刪除這筆支出？")) {
          startTransition(() => deleteExpense(id));
        }
      }}
      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
    >
      刪除
    </button>
  );
}
