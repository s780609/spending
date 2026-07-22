"use client";

import { useTransition } from "react";
import { extendPledge, undoExtendPledge } from "@/app/actions";

/** 質押「已申請展期」按鈕：按下後展期次數 +1，期限往後一期。 */
export function PledgeExtendButton({
  id,
  extensionCount,
}: {
  id: number;
  extensionCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (confirm("確認已向銀行申請展期？期限將往後推 6 個月。")) {
            startTransition(() => extendPledge(id));
          }
        }}
        className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
      >
        已申請展期
      </button>
      {extensionCount > 0 && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("復原一次展期紀錄？")) {
              startTransition(() => undoExtendPledge(id));
            }
          }}
          className="rounded-full px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 disabled:opacity-50"
        >
          復原
        </button>
      )}
    </span>
  );
}
