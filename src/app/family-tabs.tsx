import { SubTabs } from "@/app/sub-tabs";

const TABS = [
  { key: "list", label: "明細", href: "/family" },
  { key: "import", label: "匯入帳單 PDF", href: "/family/import" },
] as const;

export type FamilyTab = (typeof TABS)[number]["key"];

/** 家庭記帳子功能頁籤 */
export function FamilyTabs({ active }: { active: FamilyTab }) {
  return <SubTabs tabs={TABS} active={active} />;
}
