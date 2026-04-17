import { GetData } from "@/components/features/getData";
import MyRecordsClient from "../client";

interface PageProps {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export interface MyRecord {
    id: number;
    destination: string;
    content: string;
    usageType: string;
    status: string;
    startDate: string;
    vehicle: {
        id: number;
        number: string;
    };
    endDate: string;
    employee: {
        id: number;
        name: string;
        affiliationName: string;
    };
}

export interface VehicleRecord {
    id: number;
    isInspection: boolean;
    isMissInfoAdd: boolean;
    vehicleStatus: string | null;
    totalDistance: number;
    beforeDistance: number;
    currentDistance: number;
    commuteDistance: number;
    businessDistance: number;
    content: string;
    useDate: string;
    employee: {
        id: number;
        name: string;
        affiliationName: string;
    } | null;
    vehicle: {
        id: number;
        number: string;
        name: string;
    };
}

export default async function page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const search = await searchParams;

    // slug가 없거나 비어있으면 에러 처리
    if (!slug || slug.length === 0) {
        return <div>잘못된 접근입니다.</div>;
    }

    // slug[0]: employeeId
    // slug[1]: type (reservation, logs)
    // slug[2]: startDate
    // slug[3]: endDate
    const id = slug[0];
    const tab = slug[1];

    // 페이지네이션 파라미터 추출
    const page = search?.page as string | undefined;
    const size = search?.size as string | undefined;

    // 기본 날짜 설정
    const today = new Date();
    const kstDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(today);
    const currentYear = today.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const startDate = slug[2] || (tab === "logs" ? yearStart : yearStart);
    const endDate = slug[3] || (tab === "logs" ? yearEnd : kstDate);

    // URL 구성

    let url = "";
    let apiSearchParams: Record<string, string | string[]> = {};

    if (tab === "reservation") {
        url = `/vrs/vehicle-reservations/my`;
        apiSearchParams = {
            "startDate<>": `${startDate},${endDate}`,
        };
        if (page !== undefined) {
            apiSearchParams.page = page;
        }
        if (size !== undefined) {
            apiSearchParams.size = size;
        }
    } else if (tab === "logs") {
        url = `/vrs/vehicle-records/find/all`;
        apiSearchParams = {
            employeeNumber: slug[0],
            "useDate<>": `${startDate},${endDate}`,
        };
        if (page !== undefined) {
            apiSearchParams.page = page;
        }
        if (size !== undefined) {
            apiSearchParams.size = size;
        }
    } else {
        return <div>잘못된 타입입니다: {tab}</div>;
    }

    if (tab === "reservation") {
        return (
            <GetData<MyRecord>
                url={url}
                tags={["my-records"]}
                searchParams={apiSearchParams}
                isArray={true}
                filterType={[]}
                dataIndex="content"
                paging={true}
            >
                {(
                    content,
                    queryString,
                    page,
                    size,
                    totalElements,
                    totalPages,
                    hasNext,
                ) => (
                    <MyRecordsClient
                        content={content || []}
                        page={page}
                        size={size}
                        totalElements={totalElements}
                        totalPages={totalPages}
                        hasNext={hasNext}
                    />
                )}
            </GetData>
        );
    } else {
        return (
            <GetData<VehicleRecord>
                url={url}
                tags={["my-records"]}
                searchParams={apiSearchParams}
                isArray={true}
                filterType={[]}
                dataIndex="content"
                paging={true}
            >
                {(
                    content,
                    queryString,
                    page,
                    size,
                    totalElements,
                    totalPages,
                    hasNext,
                ) => (
                    <MyRecordsClient
                        content={content}
                        page={page}
                        size={size}
                        totalElements={totalElements}
                        totalPages={totalPages}
                        hasNext={hasNext}
                    />
                )}
            </GetData>
        );
    }
}
