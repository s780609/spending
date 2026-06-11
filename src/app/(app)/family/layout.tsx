import type { ReactNode } from "react";
import { FamilyTabs } from "@/app/family-tabs";

/** 家庭子功能共用外框：頁籤常駐，切換時只更換下方內容 */
export default function FamilyLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <FamilyTabs />
      {children}
    </main>
  );
}
