import Client from "@/(main-layout)/vehicles/client";
import { GetData } from "@/components/features/getData";
import { Car } from "@/lib/stores/carStore";

interface PageProps {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface VehicleRecord {
    id: number;
    isInspection: boolean;
    isMissInfoAdd: boolean;
    vehicleStatus: string | null;
    totalDistance: number | null;
    beforeDistance: number | null;
    currentDistance: number | null;
    commuteDistance: number | null;
    businessDistance: number | null;
    content: string | null;
    useDate: string;
    createdDate: string;
    employee?: {
        employeeNumber: number;
        name: string;
        affiliationName: string;
    } | null;
    vehicle: {
        id: number;
        number: string;
        name: string;
    };
}

interface VehicleReservation {
    id: number;
    destination: string | null;
    content: string | null;
    status: string | null;
    usageType: string | null;
    startDate: string;
    endDate: string | null;
    employee: {
        employeeNumber: string;
        name: string;
        affiliationName: string;
    } | null;
    vehicle: {
        id: number;
        number: string;
        name: string;
    };
}

export default async function Page({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const search = await searchParams;

    console.log("🔍 [vehicles/page.tsx] slug:", slug);
    console.log("🔍 [vehicles/page.tsx] searchParams:", search);

    // slug가 없거나 비어있으면 에러 처리
    if (!slug || slug.length === 0) {
        return <div>잘못된 접근입니다.</div>;
    }

    // slug 파싱
    // slug[0]: 차량 ID
    // slug[1]: 탭 (drivingLogs, reservations) - optional
    const vehicleId = slug[0];
    const tab = slug[1] || "drivingLogs"; // 기본값: drivingLogs

    console.log("🔍 [vehicles/page.tsx] vehicleId:", vehicleId, "tab:", tab);

    // 정렬 파라미터 추출 (sort 파라미터 사용)
    const sort = search?.sort as string | undefined;

    // 날짜 필터 파라미터 추출
    const useDateRange = search?.["useDate<>"] as string | undefined; // 운행일지용
    const startDateRange = search?.["startDate<>"] as string | undefined; // 예약용

    // 페이지네이션 파라미터 추출
    const page = search?.page as string | undefined;
    const size = search?.size as string | undefined;
    const all = search?.all as string | undefined;

    return (
        <GetData<Car, false>
            url={`/vrs/vehicles/find/${vehicleId}`}
            tags={["vehicle"]}
            searchParams={undefined}
            filterType={[]}
            paging={false}
            isArray={false}
        >
            {(vehicleData) => {
                if (!vehicleData) {
                    return <div>차량 정보를 불러올 수 없습니다.</div>;
                } else {
                    console.log(vehicleData, "차량 정보");
                }

                // searchParams 구성 (검색, 정렬, 날짜 필터, 페이지네이션 포함)
                const apiSearchParams: Record<string, string> = {
                    vehicleId: vehicleId as string,
                };

                // 검색 파라미터 추가 - URL의 모든 파라미터를 순회하면서 검색 필드 찾기
                // 운행일지: employeeName, useDate
                // 예약내역: employeeName, affiliationName, destination
                console.log(
                    "🔍 [vehicles/page.tsx] All search params:",
                    Object.keys(search || {}),
                );
                const searchFields = [
                    "employeeName",
                    "affiliationName",
                    "destination",
                    "employee.name",
                    "useDate",
                    "department",
                    "purpose",
                ];
                for (const field of searchFields) {
                    const value = search?.[field] as string | undefined;
                    console.log(
                        `🔍 [vehicles/page.tsx] Checking field: ${field}, value:`,
                        value,
                    );
                    if (value) {
                        apiSearchParams[field] = value;
                        // break 제거 - 모든 검색 필드 추가
                    }
                }

                // 탭별 기본 정렬 설정
                if (tab === "drivingLogs") {
                    apiSearchParams.sort = sort || "currentDistance.desc";
                } else if (tab === "reservations") {
                    apiSearchParams.sort = sort || "startDate.desc";
                } else if (sort) {
                    apiSearchParams.sort = sort;
                }

                if (useDateRange) {
                    apiSearchParams["useDate<>"] = useDateRange;
                }

                if (startDateRange) {
                    apiSearchParams["startDate<>"] = startDateRange;
                }

                if (page !== undefined) {
                    apiSearchParams.page = page;
                }

                // all=true일 때는 size를 보내지 않음
                if (all === "true") {
                    apiSearchParams.all = all;
                } else if (size !== undefined) {
                    apiSearchParams.size = size;
                }

                console.log(
                    "🔍 [vehicles/page.tsx] apiSearchParams:",
                    apiSearchParams,
                );

                // 탭에 따라 다른 API 호출
                if (tab === "reservations") {
                    return (
                        <GetData<VehicleReservation>
                            url={`/vrs/vehicle-reservations/find/all`}
                            tags={["vehicle-reservations"]}
                            searchParams={apiSearchParams}
                            filterType={[]}
                            paging={true}
                            isArray={true}
                            dataIndex="content"
                        >
                            {(
                                reservations,
                                queryString,
                                page,
                                size,
                                totalElements,
                                totalPages,
                            ) => {
                                console.log(
                                    "🔍 [page.tsx] reservations received:",
                                    reservations,
                                );
                                console.log("🔍 [page.tsx] paging info:", {
                                    page,
                                    size,
                                    totalElements,
                                    totalPages,
                                });
                                return (
                                    <Client
                                        slug={slug}
                                        content={vehicleData}
                                        records={[]}
                                        reservations={reservations || []}
                                        reservationPage={page}
                                        reservationSize={size}
                                        reservationTotalElements={totalElements}
                                        reservationTotalPages={totalPages}
                                    />
                                );
                            }}
                        </GetData>
                    );
                } else {
                    return (
                        <GetData<VehicleRecord>
                            url={`/vrs/vehicle-records/find/all`}
                            tags={["vehicle-records"]}
                            searchParams={apiSearchParams}
                            filterType={[]}
                            paging={true}
                            isArray={true}
                            dataIndex="content"
                        >
                            {(
                                records,
                                queryString,
                                page,
                                size,
                                totalElements,
                                totalPages,
                            ) => (
                                <Client
                                    slug={slug}
                                    content={vehicleData}
                                    records={records || []}
                                    reservations={[]}
                                    recordPage={page}
                                    recordSize={size}
                                    recordTotalElements={totalElements}
                                    recordTotalPages={totalPages}
                                />
                            )}
                        </GetData>
                    );
                }
            }}
        </GetData>
    );
}
