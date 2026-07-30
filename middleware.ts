import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// lib/axios.ts의 PORTAL_URL과 동일한 규칙 (재로그인이 필요할 때 이동할 곳)
const PORTAL_URL =
    process.env.PORTAL_REDIRECT || "https://portal.mswpms.co.kr:444/";

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
function isTokenExpired(token: string, bufferSeconds = 20): boolean {
    const decoded = decodeJWT(token);
    if (!decoded?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return now + bufferSeconds >= decoded.exp;
}

// accessToken, refreshToken 쿠키 삭제
function clearAuthCookies(response: NextResponse) {
    response.cookies.delete("Authorization");
    response.cookies.delete("Refresh");
    return response;
}

// refresh로 복구 불가능한 상태 -> 쿠키 정리 후 포털로 리다이렉트
function redirectToPortal(request: NextRequest) {
    const url = new URL(PORTAL_URL);
    url.searchParams.set("redirectUrl", request.nextUrl.href);
    return clearAuthCookies(NextResponse.redirect(url));
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

    // accessToken이 아직 유효하면 통과
    if (!isTokenExpired(accessToken)) {
        return NextResponse.next();
    }

    // refreshToken까지 만료됐다면 refresh를 시도해도 어차피 실패 -> 바로 재로그인
    if (isTokenExpired(refreshToken, 0)) {
        console.log("🔄 [Middleware] refreshToken 만료 - 포털로 리다이렉트");
        return redirectToPortal(request);
    }

    // accessToken만 만료된 경우 refresh 시도
    // (GetData는 Server Component라서 쿠키 설정 불가 → Middleware에서 처리 필요)
    try {
        // 로컬: NEXT_PUBLIC_API_URL=local, 배포: 미설정 (axios.ts getBaseURL()과 동일한 규칙)
        const serverBaseURL =
            process.env.NEXT_PUBLIC_API_URL === "local"
                ? "http://192.168.20.249:35000"
                : "https://mswpms.co.kr:35000";

        const refreshResponse = await fetch(
            `${serverBaseURL}/api/auth/refresh`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: `Refresh=${refreshToken}`,
                },
                body: JSON.stringify({ refreshToken }),
            },
        );

        // refresh 자체가 실패 (리프레시 토큰 무효/만료 등) -> 재로그인
        if (!refreshResponse.ok) {
            console.error(
                "❌ [Middleware] refresh 실패:",
                refreshResponse.status,
            );
            return redirectToPortal(request);
        }

        const setCookieHeaders = refreshResponse.headers.getSetCookie();

        // GetData 같은 Server Component는 이번 요청의 쿠키(cookies())를 그대로 읽기 때문에,
        // Set-Cookie만으로는 "다음 요청부터"만 반영된다.
        // 이번 요청 안에서도 새 토큰을 쓰도록 request 쪽 쿠키도 즉시 갱신해준다.
        setCookieHeaders.forEach((cookie) => {
            const [pair] = cookie.split(";");
            const eqIdx = pair.indexOf("=");
            if (eqIdx > -1) {
                const name = pair.slice(0, eqIdx).trim();
                const value = pair.slice(eqIdx + 1).trim();
                if (name === "Authorization" || name === "Refresh") {
                    request.cookies.set(name, value);
                }
            }
        });

        // 위에서 갱신한 request 쿠키를 이번 요청의 하위 Server Component까지 전달
        const response = NextResponse.next({ request });
        setCookieHeaders.forEach((cookie) => {
            response.headers.append("Set-Cookie", cookie);
        });

        console.log("✅ [Middleware] 토큰 갱신 완료");
        return response;
    } catch (error) {
        // refresh 요청 자체가 실패 (네트워크 오류 등) -> 재로그인
        console.error("❌ [Middleware] refresh 요청 실패:", error);
        return redirectToPortal(request);
    }
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
