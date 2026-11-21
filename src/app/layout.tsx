import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "記帳小工具",
  description: "簡單記帳與電子發票 CSV 匯入",
  // iOS 加到主畫面時顯示的名稱
  appleWebApp: { title: "記帳" },
};

/** 瀏覽器／iOS 狀態列底色，對齊深色主題 */
export const viewport: Viewport = {
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 手機底部分頁列為 fixed，預留底部空間避免蓋住內容 */}
      <body className="min-h-full flex flex-col pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</body>
    </html>
  );
}
