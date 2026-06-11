import { SubTabs } from "@/app/sub-tabs";

const TABS = [
  { key: "list", label: "明細", href: "/family" },
  { key: "import", label: "匯入帳單 PDF", href: "/family/import" },
] as const;

/** 家庭記帳子功能頁籤 */
export function FamilyTabs() {
  return <SubTabs tabs={TABS} />;
}
