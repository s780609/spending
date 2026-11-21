import type { MetadataRoute } from "next";

/** 加到主畫面時的名稱與圖示（iOS 主畫面圖示另由 app/apple-icon.png 提供） */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "記帳小工具",
    short_name: "記帳",
    description: "簡單記帳與電子發票 CSV 匯入",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
