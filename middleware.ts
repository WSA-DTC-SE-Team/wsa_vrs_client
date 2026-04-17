import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * JWT 디코딩 (검증 없이 payload만 추출)
 */
function decodeJWT(token: string): { exp?: number } | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8"),
        );
        return decoded;
    } catch {
        return null;
    }
}

/**
 * JWT 만료 여부 체크 (여유 시간 포함)
 * 만료 20초 전에 미리 refresh
 */
function isTokenExpired(token: string): boolean {
    const decoded = decodeJWT(token);
    if (!decoded?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 20; // 20초 여유

    return now + bufferSeconds >= decoded.exp;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 인증 불필요 경로 스킵
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/static")
    ) {
        return NextResponse.next();
    }

    const accessToken = request.cookies.get("Authorization")?.value;
    const refreshToken = request.cookies.get("Refresh")?.value;

    // 토큰이 없으면 통과
    if (!accessToken || !refreshToken) {
        return NextResponse.next();
    }

    // 토큰이 실제로 만료되었을 때만 refresh
    // (GetData는 Server Component라서 쿠키 설정 불가 → Middleware에서 처리 필요)
    if (isTokenExpired(accessToken)) {
        console.log("🔄 [Middleware] 토큰 만료 - refresh 시작");
        try {
            //  환경 변수가 있으면 로컬(249), 없으면 프로덕션(mswpms)
            const serverBaseURL = process.env.NEXT_PUBLIC_API_URL
                ? "http://192.168.20.249:35000"
                : "https://mswpms.co.kr:35000";

            //  const serverBaseURL = "http://192.168.20.249:35000";

            const refreshResponse = await fetch(
                `${serverBaseURL}/auth/refresh`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `Refresh=${refreshToken}`,
                    },
                    body: JSON.stringify({ refreshToken }),
                },
            );

            if (refreshResponse.ok) {
                // ✅ 백엔드 Set-Cookie 헤더를 파싱해서 Domain 확인/수정
                const setCookieHeaders = refreshResponse.headers.getSetCookie();
                const response = NextResponse.next();

                // 먼저 lms.dtcenter.com 쿠키를 삭제

                response.cookies.delete("Authorization");
                response.cookies.delete("Refresh");

                setCookieHeaders.forEach((cookie, i) => {
                    console.log(`  [${i}]:`, cookie);

                    // Domain이 없거나 lms.dtcenter.com이면 .dtcenter.com으로 강제 변경
                    let modifiedCookie = cookie;

                    if (!cookie.includes("Domain=")) {
                        // Domain이 없으면 .dtcenter.com 추가 (점으로 시작 = 서브도메인 공유)
                        modifiedCookie = cookie + "; Domain=.dtcenter.com";
                        console.log(`    → Domain 추가: Domain=.dtcenter.com`);
                    } else if (cookie.includes("Domain=lms.dtcenter.com")) {
                        // lms.dtcenter.com → .dtcenter.com 변경
                        modifiedCookie = cookie.replace(
                            "Domain=lms.dtcenter.com",
                            "Domain=.dtcenter.com",
                        );
                        console.log(
                            `    → Domain 변경: lms.dtcenter.com → .dtcenter.com`,
                        );
                    } else if (
                        cookie.includes("Domain=dtcenter.com") &&
                        !cookie.includes("Domain=.dtcenter.com")
                    ) {
                        // dtcenter.com → .dtcenter.com 변경
                        modifiedCookie = cookie.replace(
                            "Domain=dtcenter.com",
                            "Domain=.dtcenter.com",
                        );
                    }

                    response.headers.append("Set-Cookie", modifiedCookie);
                });

                console.log(
                    "✅ [Middleware] 토큰 갱신 완료 - .dtcenter.com 쿠키로 설정",
                );
                return response;
            }
        } catch (error) {
            console.error("❌ [Middleware] refresh 실패:", error);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * - / (루트)
         * - 모든 하위 경로 ( /dashboard, /users 등 )
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
