// import { cookies } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import https from "https";

interface FilterType {
    key: string;
    title: string;
    options: {
        title: string;
        value: string;
    }[];
}

interface ErrorType {
    detail: string;
    errorCode: string;
    instance: string;
    status: number;
    timestamp: string;
    title: string;
    type: string;
}

async function pagingTableGetData<T>(
    url: string,
    params: Record<string, string | string[] | undefined> | string,
    tag: string[],
    paging: boolean,
    dataIndex?: string,
    customHeaders?: Record<string, string>,
): Promise<PageResponse<T>> {
    const safeParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined),
    );

    const queryString = new URLSearchParams(
        safeParams as Record<string, string>,
    ).toString();

    const temp: PageResponse<T> = {
        content: null,
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: 0,
        hasNext: false,
        queryString: "",
    };

    // URL에 이미 쿼리 파라미터가 있는지 확인
    const separator = url.includes("?") ? "&" : "?";
    const realUrl = queryString ? `${url}${separator}${queryString}` : url;

    // 서버 컴포넌트는 절대 URL 필요 - 직접 API 서버로 호출
    // 환경 변수가 "local"이면 로컬(249:35000), 아니면 배포(localhost:8081)
    const isLocal = process.env.NEXT_PUBLIC_API_URL === "local";
    const baseUrl = isLocal
        ? "http://192.168.20.249:35000"
        : "http://localhost:8081";
    const fullUrl = `${baseUrl}/api${realUrl}`;

    // 프록시를 위한 인코딩된 URL
    const encodedUrl = encodeURIComponent(realUrl);

    // 서버 컴포넌트에서 쿠키와 현재 URL 정보 가져오기
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Authorization 쿠키만 사용 (액세스 토큰)
    const authCookie = allCookies.find((c) => c.name === "Authorization");
    const cookieHeader = authCookie
        ? `${authCookie.name}=${authCookie.value}`
        : "";

    console.log("cookieHeader:", cookieHeader);

    console.log("🔵 [GetData] Request:", fullUrl);

    const authToken = cookieStore.get("Authorization")?.value;

    // redirect 플래그 (try-catch 밖에서 처리하기 위함)
    let shouldRedirectToPortal = false;
    let redirectUrl = "";
    // HTTPS 에이전트 설정 (SSL 인증서 검증 비활성화 - 내부망용)
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false, // 자체 서명 인증서 허용
    });

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
        const requestHeaders = {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }), // 토큰이 있으면 Bearer 추가
            ...(cookieHeader && { Cookie: cookieHeader }), // 모든 쿠키 전송
        };

        const res = await fetch(fullUrl, {
            next: { tags: tag },
            headers: {
                ...requestHeaders,
                "x-target-path": encodedUrl, // ★ 중요: 프록시가 어디로 가야할지 헤더로 알려줌 (인코딩된 URL 사용)
            },
            signal: controller.signal,
            // @ts-expect-error - Node.js fetch에서 agent 사용
            agent: fullUrl.startsWith("https") ? httpsAgent : undefined,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            const errorDetail = errorData?.detail || "";
            const errorCode = errorData?.errorCode;

            // 기본 에러 메시지 (errorData.detail 사용)
            let errorMessage =
                errorData?.detail ||
                `데이터를 불러오는데 실패했습니다. (${res.status})`;

            // 토큰 에러일 경우 (1022 제외한 모든 102x 에러)
            // 1022는 middleware에서 refresh 처리하므로 여기까지 오지 않음
            const isTokenError =
                errorCode &&
                errorCode !== 1022 &&
                String(errorCode).startsWith("102");

            if (isTokenError) {
                const TEMPT_PORTAL_URL = "https://portal.mswpms.co.kr:444/";

                // 토큰 에러 메시지 (사용자에게 보여줄 메시지)
                errorMessage = "인증 오류가 발생했습니다. 다시 로그인해주세요.";

                // redirect 플래그 설정 (try-catch 밖에서 실행)
                shouldRedirectToPortal = true;
                //  redirectUrl = TEMPT_PORTAL_URL;
            }

            console.log("❌ [GetData Server Error]", {
                method: "GET",
                url: url,
                status: res.status,
                errorCode: errorCode,
                errorDetail: errorDetail,
                finalErrorMessage: errorMessage,
            });

            return {
                ...temp,
                error: errorMessage,
                isNetworkError: false,
            };
        }

        const responseText = await res.text();

        if (!responseText || responseText.trim() === "") {
            console.log("Empty response, returning temp");
            return temp;
        }

        const data = JSON.parse(responseText);

        console.log("✅ [GetData Server Response]", {
            method: "GET",
            url: url,
            fullURL: fullUrl,
            status: res.status,
            statusText: res.statusText,
            dataPreview: data
                ? Array.isArray(data.content)
                    ? `Array(${data.content.length})`
                    : typeof data
                : "empty",
        });

        // dataIndex를 사용하여 동적으로 데이터 추출
        let extractedContent = data;

        if (dataIndex !== undefined && dataIndex.trim() !== "") {
            const keys = dataIndex.split(".").filter((k) => k.trim() !== "");

            for (const key of keys) {
                if (extractedContent && extractedContent[key] !== undefined) {
                    extractedContent = extractedContent[key];
                } else {
                    extractedContent = null;
                    break;
                }
            }
        }

        // paging이 false면 페이징 정보 기본값 설정
        if (!paging) {
            const finalContent =
                extractedContent !== undefined ? extractedContent : data;
            return {
                content: finalContent,
                queryString,
                page: 0,
                size: 0,
                totalElements: 0,
                totalPages: 0,
                hasNext: false,
            };
        }

        // paging이 true면 응답에서 페이징 정보 추출
        const finalContent =
            extractedContent !== undefined ? extractedContent : data;

        // slice 객체에서 페이징 정보 추출 (API 응답 형식: { content: [], slice: {...} })
        const sliceInfo = data.slice || {};
        const pageInfo = data.page || {};

        return {
            content: finalContent,
            queryString,
            page: sliceInfo.page ?? pageInfo.page ?? data.page ?? 0,
            size: sliceInfo.size ?? pageInfo.size ?? data.size ?? 0,
            totalElements:
                sliceInfo.totalElements ??
                pageInfo.totalElements ??
                data.totalElements ??
                sliceInfo.numberOfElements ??
                0,
            totalPages:
                sliceInfo.totalPages ??
                pageInfo.totalPages ??
                data.totalPages ??
                0,
            hasNext: pageInfo.hasNext ?? sliceInfo.hasNext ?? false,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "네트워크 연결에 실패했습니다.";
        console.error("❌ [GetData Fetch Error]:", error);
        console.error("❌ [GetData Full URL]:", fullUrl);
        console.error("❌ [GetData Path]:", realUrl);
        console.error("❌ [GetData Error Details]:", {
            name: error instanceof Error ? error.name : "Unknown",
            message: error instanceof Error ? error.message : String(error),
            cause: error instanceof Error ? error.cause : undefined,
        });
        return {
            ...temp,
            error: errorMessage,
            isNetworkError: true,
        };
    } finally {
        // redirect가 필요한 경우 여기서 실행
        if (shouldRedirectToPortal && redirectUrl) {
            redirect(redirectUrl);
        }
    }
}

interface PageResponse<T> {
    content: T[] | T | null;
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    queryString: string;
    error?: string;
    isNetworkError?: boolean;
}

interface GetDataProps<T, IsArray extends boolean = true> {
    url: string;
    tags: string[];
    searchParams: Record<string, string | string[] | undefined> | undefined;
    filterType: FilterType[] | [];
    children: (
        data: IsArray extends true ? T[] : T | null,
        queryString: string,
        page?: number,
        size?: number,
        totalElements?: number,
        totalPages?: number,
        hasNext?: boolean,
        searchParams?: Record<string, string | string[] | undefined>,
    ) => React.ReactNode;
    paging?: boolean;
    isArray?: IsArray;
    dataIndex?: string;
    headers?: Record<string, string>;
}

export const GetData = async <T, IsArray extends boolean = true>({
    url,
    tags,
    searchParams,
    filterType,
    children,
    paging = false,
    isArray = true as IsArray,
    dataIndex,
    headers,
}: GetDataProps<T, IsArray>) => {
    const paramsWithDefaults = paging
        ? {
              ...searchParams,
              page: searchParams?.page ?? "0",
              // all=true일 때는 size를 추가하지 않음
              ...(searchParams?.all !== "true" && {
                  size: searchParams?.size ?? "10",
              }),
          }
        : searchParams || {};

    const {
        content,
        page,
        size,
        totalPages,
        queryString,
        totalElements,
        hasNext,
        error,
        isNetworkError,
    } = await pagingTableGetData<T>(
        url,
        paramsWithDefaults,
        tags,
        paging,
        dataIndex,
        headers,
    );

    const data = content;

    return (
        <>
            {paging
                ? children(
                      data as IsArray extends true ? T[] : T,
                      queryString,
                      page,
                      size,
                      totalElements,
                      totalPages,
                      hasNext,
                      searchParams,
                  )
                : children(data as IsArray extends true ? T[] : T, queryString)}
        </>
    );
};
