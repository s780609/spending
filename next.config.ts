import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist 依賴 worker / import.meta.url / 字型路徑，被 Next 打包後會在執行期壞掉，
  // 改用原生 Node 載入；@napi-rs/canvas 是 native 模組，提供 pdfjs 需要的 DOMMatrix
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  // pdfjs 以字串路徑動態載入 worker，Vercel 的檔案追蹤抓不到，
  // 需手動把 worker 檔包進 /family/import（唯一會解析 PDF 的路由）函式
  outputFileTracingIncludes: {
    "/family/import": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
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
