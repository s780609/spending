import type { ReactNode } from "react";
import { BookkeepingTabs } from "@/app/bookkeeping-tabs";

/** 記帳子功能共用外框：頁籤常駐，切換時只更換下方內容 */
export default function ExpensesLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BookkeepingTabs />
      {children}
    </main>
  );
}
