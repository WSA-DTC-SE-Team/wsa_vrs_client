import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import useAlertStore from "./stores/alertStore";

const isServer = typeof window === "undefined";

// 클라이언트에서는 항상 상대경로 /api 사용 (Next.js rewrite 통해 프록시)
// 서버에서만 직접 백엔드 URL 사용
const getBaseURL = () => {
    if (!isServer) {
        // 클라이언트: Next.js를 통해 프록시
        return "/api";
    }

    // 서버: 백엔드 직접 호출
    let apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl === "local") {
        apiUrl = "http://192.168.20.70:35000";
    } else if (!apiUrl) {
        apiUrl = "https://mswpms.co.kr:35000";
    }
    return `${apiUrl}/api`;
};

// 재로그인 시 이동할 포털 URL
const PORTAL_URL =
    process.env.PORTAL_REDIRECT || "https://portal.mswpms.co.kr:444/";

const axiosInstance = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000, // 10초 타임아웃
    withCredentials: true, // 쿠키 포함
    headers: {
        "Content-Type": "application/json",
    },
});

// 요청 인터셉터
axiosInstance.interceptors.request.use(
    (config) => {
        console.log("🚀 [Axios Request]", {
            isServer,
            method: config.method?.toUpperCase(),
            baseURL: config.baseURL,
            url: config.url,
            fullURL: config.baseURL
                ? `${config.baseURL}${config.url}`
                : config.url,
            headers: config.headers,
            params: config.params,
        });
        return config;
    },
    (error) => {
        console.error("❌ [Axios Request Error]", error);
        return Promise.reject(error);
    },
);

// Refresh 토큰 로직
type RConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const isAuthPath = (u = "") =>
    u.includes("/auth/refresh") ||
    u.includes("/auth/login") ||
    u.includes("/auth/logout");

// 서버가 내려주는 인증 관련 errorCode (401 응답의 properties.errorCode)
const AUTH_ERROR_CODE = {
    NO_TOKEN: 9001, // 토큰 없음 -> 재로그인
    EXPIRED: 9002, // 만료 -> refresh 시도
    INVALID: 9003, // 무효(변조/서명오류) -> 재로그인
    LOGGED_OUT: 9004, // 로그아웃(denylist) -> 재로그인
    NO_USER: 9005, // 사용자정보 없음 -> 재로그인
} as const;

// 백엔드는 RFC7807 ProblemDetail 형식으로 응답하며, errorCode는 properties 안에 들어있다.
const getErrorCode = (error: AxiosError<any>): number | string | undefined =>
    error.response?.data?.properties?.errorCode ??
    error.response?.data?.errorCode;

let refreshInFlight: Promise<unknown> | null = null;

const doRefresh = async () => {
    console.log("🔄 [Axios doRefresh] refresh 시작");

    // 만료된 인증 쿠키 정리 (서버 Set-Cookie가 재설정을 처리)
    document.cookie = "Authorization=; path=/; max-age=0";
    document.cookie = "Refresh=; path=/; max-age=0";

    try {
        return await axiosInstance.post("/auth/refresh");
    } catch (error) {
        console.error("❌ [Axios doRefresh] 실패:", error);
        throw error;
    }
};

// 응답 인터셉터
axiosInstance.interceptors.response.use(
    (response) => {
        // HTML 응답 방어 로직 (로그인 페이지 등)
        const contentType = response.headers["content-type"] || "";
        const isHtml = contentType.includes("text/html");
        const dataIsString = typeof response.data === "string";
        const looksLikeHtml =
            dataIsString && response.data.trim().startsWith("<!DOCTYPE");

        if (isHtml || looksLikeHtml) {
            console.error(
                "❌ [HTML Response Detected - Authentication Required]",
                {
                    isServer,
                    url: response.config.url,
                    contentType,
                },
            );

            return Promise.reject({
                response: {
                    status: 401,
                    data: {
                        errorCode: "AUTH_REQUIRED",
                        message:
                            "Authentication required - received HTML instead of JSON",
                    },
                },
                config: response.config,
                isHtmlResponse: true,
            });
        }

        console.log("✅ [Axios Response]", {
            isServer,
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status,
        });
        return response;
    },
    async (error: AxiosError<any>) => {
        const { setAlert } = useAlertStore.getState();
        const original = error.config as RConfig;
        const url = original?.url || "";
        const status = error.response?.status;
        const errorCode = getErrorCode(error);
        const detail = error.response?.data?.detail as string | undefined;

        // refresh/로그인/로그아웃 같은 인증 경로는 아래 로직에서 제외
        if (isAuthPath(url)) {
            return Promise.reject(error);
        }

        // 403: 권한 없음 -> 안내만 하고 재로그인은 하지 않음
        if (status === 403) {
            setAlert("error", detail || "권한이 없습니다.");
            return Promise.reject(error);
        }

        if (status === 401) {
            // 만료(9002)일 때만 refresh 시도. 서버 환경에서는 리프레시 불가
            if (
                errorCode === AUTH_ERROR_CODE.EXPIRED &&
                !isServer &&
                !original?._retry
            ) {
                console.log("🔄 Axios: 토큰 만료 감지, 리프레시 시작");
                original._retry = true;
                try {
                    if (!refreshInFlight) {
                        console.log("🔄 Axios: doRefresh() 호출");
                        refreshInFlight = doRefresh().finally(
                            () => (refreshInFlight = null),
                        );
                    }
                    await refreshInFlight;
                    console.log("✅ Axios: 리프레시 완료, 원래 요청 재시도");
                    return axiosInstance(original);
                } catch (e) {
                    console.error("❌ Axios: 리프레시 실패", e);
                    const refreshErrorDetail = axios.isAxiosError(e)
                        ? (e.response?.data?.detail as string | undefined)
                        : undefined;
                    setAlert(
                        "error",
                        refreshErrorDetail ||
                            "세션이 만료되었습니다. 다시 로그인해주세요.",
                    );
                    return Promise.reject(e);
                }
            }

            // refresh로 복구되지 않는 401(NO_TOKEN/INVALID/LOGGED_OUT/NO_USER 등) -> 즉시 재로그인
            console.log(
                "[AUTH] Unrecoverable 401, redirecting to login:",
                errorCode,
                detail,
            );
            setAlert("error", detail || "다시 로그인이 필요합니다.");
            window.location.href = `${PORTAL_URL}?redirectUrl=${encodeURIComponent(window.location.href)}`;
            return Promise.reject(error);
        }

        // 그 외 일반 에러
        setAlert("error", detail || "요청 처리 중 오류가 발생했습니다.");
        return Promise.reject(error);
    },
);

export default axiosInstance;
