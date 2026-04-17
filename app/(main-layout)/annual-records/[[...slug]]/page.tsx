import Client from "@/(main-layout)/annual-records/Client";
import { GetData } from "@/components/features/getData";

interface PageProps {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface VehicleRecord {
    id: number;
    isInspection: boolean;
    vehicleStatus: string | null;
    totalDistance: number | null;
    beforeDistance: number | null;
    currentDistance: number | null;
    commuteDistance: number | null;
    createdDate: string;
    businessDistance: number | null;
    content: string | null;
    useDate: string;
    employee: {
        id: number;
        name: string;
        deptName: string;
    } | null;
    vehicle: {
        id: number;
        number: string;
        name: string;
    };
}

export default async function Page({
    params,
    searchParams: search,
}: PageProps) {
    const { slug } = await params;
    const searchParamsData = await search;

    // slug[0]: 연도, slug[1]: 차량 ID (optional)
    const currentYear = new Date().getFullYear();
    const year = slug && slug[0] ? slug[0] : String(currentYear);
    const vehicleId = slug && slug[1] ? slug[1] : undefined;

    // 페이지네이션 파라미터 추출
    const page = searchParamsData?.page as string | undefined;
    const size = searchParamsData?.size as string | undefined;
    const all = searchParamsData?.all as string | undefined;

    // 해당 연도의 1월 1일 ~ 12월 31일
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // searchParams 구성
    const searchParams: Record<string, string> = {
        b: "useDate<>",
        bq: `${startDate},${endDate}`,
    };

    // 차량 ID가 있으면 필터 추가
    if (vehicleId) {
        searchParams.vehicleId = vehicleId;
    }

    // 페이지네이션 파라미터 추가
    if (page !== undefined) {
        searchParams.page = page;
    }

    // all=true일 때는 size를 보내지 않음
    if (all === "true") {
        searchParams.all = all;
    } else if (size !== undefined) {
        searchParams.size = size;
    }

    return (
        <GetData<VehicleRecord>
            url="/api/vrs/vehicle-records/find/all"
            tags={["annual-records"]}
            searchParams={searchParams}
            filterType={[]}
            paging={true}
            isArray={true}
            dataIndex="content"
        >
            {(records) => {
                // deptName을 affiliationName으로 변환
                const mappedRecords = (records || []).map((record) => ({
                    ...record,
                    employee: record.employee
                        ? {
                              ...record.employee,
                              affiliationName: record.employee.deptName,
                          }
                        : null,
                }));
                return (
                    <Client
                        records={mappedRecords}
                        year={year}
                        selectedVehicleId={vehicleId}
                    />
                );
            }}
        </GetData>
    );
}
