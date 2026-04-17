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
        // 수정된 로직: 값이 "local"이면 내부 IP를, 아니면 환경 변수 값 그대로(또는 기본값) 사용
        let apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (apiUrl === "local") {
            apiUrl = "http://192.168.20.249:35000";
        } else if (!apiUrl) {
            apiUrl = "https://mswpms.co.kr:35000";
        }

        console.log("🚀 [Rewrites] Target API URL:", apiUrl);

        return [
            {
                source: "/api/:path*",
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
