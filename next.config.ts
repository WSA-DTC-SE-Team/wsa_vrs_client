import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    compiler: {
        emotion: true,
    },
    reactStrictMode: false,

    ...(process.env.NODE_ENV === "production"
        ? {
              output: "standalone",
              outputFileTracingRoot: path.join(__dirname, "../"),
          }
        : {}),

    async rewrites() {
        // 환경에 따른 API URL 설정
        const apiUrl =
            process.env.NEXT_PUBLIC_API_URL === "local"
                ? "http://192.168.20.249:35000"
                : "https://mswpms.co.kr:35000";

        console.log("🔧 [next.config] API URL:", apiUrl);

        return [
            {
                source: "/api/:path*",
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
