"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * 表單送出按鈕：透過 useFormStatus 讀取所在 <form> 的 pending 狀態，
 * 送出期間只 disable 按鈕本身並顯示 spinner（等待 API / Neon 冷啟動時），
 * 不會鎖住整個畫面。需巢狀在 <form action={...}> 之內才能取得狀態。
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 ${className ?? ""}`}
    >
      {pending && (
        <svg
          className="h-4 w-4 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
