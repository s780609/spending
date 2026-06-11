import Link from "next/link";

const TABS = [
  { key: "list", label: "明細", href: "/" },
  { key: "import", label: "匯入 CSV", href: "/import" },
  { key: "recurring", label: "定期支出", href: "/recurring" },
] as const;

export type BookkeepingTab = (typeof TABS)[number]["key"];

/** 記帳子功能頁籤（明細／匯入／定期支出） */
export function BookkeepingTabs({ active }: { active: BookkeepingTab }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === active
              ? "rounded-full bg-gray-950 px-3 py-1 text-xs font-medium text-white"
              : "rounded-full px-3 py-1 text-xs text-gray-600 ring-1 ring-inset ring-gray-950/10 hover:bg-gray-950/5"
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
