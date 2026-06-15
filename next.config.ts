import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist 依賴 worker / import.meta.url / 字型路徑，被 Next 打包後會在執行期壞掉，
  // 改用原生 Node 載入（帳單 PDF 解析才能正常運作）
  serverExternalPackages: ["pdfjs-dist"],
  async redirects() {
    // 路由整理前的舊網址（書籤相容）
    return [
      { source: "/import", destination: "/expenses/import", permanent: true },
      {
        source: "/recurring",
        destination: "/expenses/recurring",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
