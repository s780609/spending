import type { ReactNode } from "react";
import { Nav } from "@/app/nav";

/** 已登入頁面共用外框：導覽列放在 layout，切換頁面時不重新渲染 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
