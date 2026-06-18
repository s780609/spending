"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "assets-masked";

/**
 * 金額遮蔽：將子樹內標記 .sensitive 的元素模糊化，眼睛按鈕切換。
 * 狀態記在 localStorage；首次（或讀取前）預設遮蔽，避免金額閃現。
 */
export function PrivacyShield({
  title,
  headerExtra,
  children,
}: {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const [masked, setMaskedState] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "0") {
      // localStorage 只能在 client 掛載後讀取，無法在 render 期間決定是否遮蔽
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaskedState(false);
    }
  }, []);

  const setMasked = (update: (value: boolean) => boolean) => {
    setMaskedState((value) => {
      const next = update(value);
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          {headerExtra}
          <button
            type="button"
            onClick={() => setMasked((value) => !value)}
            aria-label={masked ? "顯示金額" : "遮蔽金額"}
            className="rounded-full p-2 text-gray-600 ring-1 ring-inset ring-gray-950/10 hover:bg-gray-950/5"
          >
            {masked ? (
              // eye-off
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <path d="M2 2l20 20" />
              </svg>
            ) : (
              // eye
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div
        className={
          masked
            ? "[&_.sensitive]:blur-[7px] [&_.sensitive]:select-none"
            : ""
        }
      >
        {children}
      </div>
    </>
  );
}
