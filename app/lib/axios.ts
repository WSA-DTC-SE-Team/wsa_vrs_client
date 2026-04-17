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
        apiUrl = "http://192.168.20.249:35000";
    } else if (!apiUrl) {
        apiUrl = "https://mswpms.co.kr:35000";
    }
    return `${apiUrl}/api`;
};

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

let refreshInFlight: Promise<unknown> | null = null;
const doRefresh = () => axiosInstance.post("/auth/refresh");

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
        console.error("❌ [Axios Response Error]", {
            isServer,
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            errorCode: error.response?.data?.errorCode,
            errorMessage: error.response?.data?.detail,
        });

        setAlert("error", error.response?.data?.detail);

        const original = error.config as RConfig;
        const url = original?.url || "";
        const detail = error.response?.data?.detail as string | undefined;
        const code = error.response?.data?.errorCode as
            | string
            | number
            | undefined;

        // 토큰 오염 시 즉시 종료
        const shouldLogout =
            detail === "JWT 토큰 처리 중 오류가 발생했습니다" ||
            detail === "잘못된 형식의 JWT 토큰입니다" ||
            detail === "JWT 토큰 서명이 유효하지 않습니다" ||
            detail === "JWT 토큰에서 클레임 추출 실패" ||
            code === 1025;

        if (shouldLogout) {
            //     window.location.href = "https://portal.mswpms.co.kr:444/";
            return Promise.reject(error);
        }

        // refresh/로그인/로그아웃 같은 인증 경로는 리프레시 로직에서 제외
        if (isAuthPath(url)) {
            return Promise.reject(error);
        }

        // 토큰 만료 케이스만 리프레시 시도 (errorCode 1022)
        const errorCode = error.response?.data?.errorCode;
        const isAccessExpired = code === "JWT_EXPIRED" || errorCode === 1022;

        if (isAccessExpired && !isServer && !original?._retry) {
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
                return Promise.reject(e);
            }
        }

        return Promise.reject(error);
    },
);

export default axiosInstance;
