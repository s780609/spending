"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 子功能分段式頁籤：依目前路徑判斷作用中項目，手機滿版等寬、桌面合身寬度 */
export function SubTabs({
  tabs,
}: {
  tabs: readonly { key: string; label: string; href: string }[];
}) {
  const pathname = usePathname();
  const active = [...tabs]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    )?.key;

  return (
    <div className="flex w-full rounded-full bg-gray-950/[0.04] dark:bg-white/[0.04] p-1 ring-1 ring-inset ring-gray-950/5 dark:ring-white/5 sm:w-fit">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex-1 rounded-full px-4 py-1.5 text-center text-xs whitespace-nowrap sm:flex-none ${
            tab.key === active
              ? "bg-white dark:bg-gray-900 font-semibold text-gray-950 dark:text-gray-50 shadow-sm ring-1 ring-gray-950/10 dark:ring-white/10"
              : "font-medium text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
