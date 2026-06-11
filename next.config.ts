import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
