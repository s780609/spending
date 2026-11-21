"use client";

import { useState } from "react";

/** 密碼輸入框，右側眼睛按鈕切換顯示／隱藏 */
export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-6">
      <input
        type={visible ? "text" : "password"}
        name="password"
        placeholder="輸入密碼"
        required
        autoFocus
        autoComplete="current-password"
        className="w-full rounded-lg bg-white dark:bg-gray-900 py-2 pl-3 pr-10 text-base ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-emerald-400 sm:text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "隱藏密碼" : "顯示密碼"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-950 dark:text-gray-500 dark:hover:text-gray-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
