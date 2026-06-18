import { SubTabs } from "@/app/sub-tabs";

const TABS = [
  { key: "list", label: "明細", href: "/expenses" },
  { key: "import", label: "匯入 CSV", href: "/expenses/import" },
  { key: "recurring", label: "定期支出", href: "/expenses/recurring" },
  { key: "budget", label: "預算", href: "/expenses/budget" },
] as const;

/** 記帳子功能頁籤（明細／匯入／定期支出） */
export function BookkeepingTabs() {
  return <SubTabs tabs={TABS} />;
}
