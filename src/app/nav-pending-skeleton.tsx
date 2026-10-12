"use client";

import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { ContentSkeleton } from "@/app/page-skeleton";

/**
 * 放在 <Link> 內：目的頁沒有 loading.tsx 時，切頁等待期間在內容區蓋上骨架。
 * 有表單 action 的頁面（記帳明細、預算、定期支出、資產、機車、家庭）不能用 loading.tsx /
 * Suspense 邊界，否則 action 後頁面原地刷新會永遠卡住（按鈕一直轉圈但資料已寫入）。
 * 有 loading.tsx 且已 prefetch 的頁面 pending 會被略過，不受影響。
 * topSelector：骨架從哪個元素的底部開始蓋（保留導覽列／子頁籤可見）；
 * className：骨架外層間距，對齊目的頁版面。
 */
export function NavPendingSkeleton({
  topSelector,
  className = "",
}: {
  topSelector: string;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) {
    return null;
  }

  // 只在點擊後的 client render 執行，此時 document 必定存在
  const top = Math.max(
    0,
    document.querySelector(topSelector)?.getBoundingClientRect().bottom ?? 0,
  );

  return createPortal(
    <div
      style={{ top }}
      // portal 的事件仍會沿 React 樹冒泡到 <Link>，擋掉避免點骨架又觸發導覽
      onClick={(event) => event.stopPropagation()}
      className="fixed inset-x-0 bottom-0 z-30 overflow-hidden bg-[#f9fafb] dark:bg-[#030712]"
    >
      <div className={`mx-auto w-full max-w-3xl px-4 ${className}`}>
        <ContentSkeleton />
      </div>
    </div>,
    document.body,
  );
}
