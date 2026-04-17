"use client";

import AddButton from "@/components/features/AddButton";
import { Car, useCarStore } from "@/lib/stores/carStore";
import styled from "@emotion/styled";
import {
    Table,
    THead,
    TBody,
    THeadRow,
    TRow,
    TH,
    TD,
    TableWrapper,
} from "@/components/common/Table";
import RecordCard from "@/components/common/RecordCard";
import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/common/CustomIcon";
import { useRouter, useSearchParams } from "next/navigation";
import Tab from "@/components/features/Tab";
import SearchBar from "@/components/common/SearchBar";
import Pagination from "@/components/common/Pagination";

import AdvancedPagination from "@/components/common/AdvancedPagination";
import { useModalStore } from "@/lib/stores/modalStore";
import { replaceDate } from "@/lib/utils/replaceDateString";
import axiosInstance from "@/lib/axios";
import useUserStore from "@/lib/stores/userStore";
import useAlertStore from "@/lib/stores/alertStore";
import { AxiosError } from "axios";

const FUEL_TYPE_MAP: Record<string, string> = {
    DIESEL: "경유",
    GAS: "휘발유",
    GASOLINE: "휘발유",
    ELECTRIC: "전기",
};

interface VehicleRecord {
    id: number;
    isInspection: boolean;
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
    employee?: {
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

interface ClientProps {
    slug: string[] | undefined;
    content: Car;
    records: VehicleRecord[];
    reservations: VehicleReservation[];
    recordPage?: number;
    recordSize?: number;
    recordTotalElements?: number;
    recordTotalPages?: number;
    reservationPage?: number;
    reservationSize?: number;
    reservationTotalElements?: number;
    reservationTotalPages?: number;
}

// Component
const Client = ({
    slug,
    content,
    records: initialRecords,
    reservations: initialReservations,
    recordTotalElements = 0,
    reservationTotalElements = 0,
}: ClientProps) => {
    const route = useRouter();
    const searchParams = useSearchParams();
    const { openModal, triggerRefresh, refreshKey } = useModalStore();
    const { user } = useUserStore();
    const { setAlert } = useAlertStore();
    const { fetchCars } = useCarStore();

    // URL에서 날짜 파라미터 파싱 (운행일지용)
    const useDateRange = searchParams.get("useDate<>");
    const [initialRecordStartDate, initialRecordEndDate] = useDateRange?.split(
        ",",
    ) || ["", ""];

    // URL에서 날짜 파라미터 파싱 (예약용)
    const startDateRange = searchParams.get("startDate<>");
    const [initialReservationStartDate, initialReservationEndDate] =
        startDateRange?.split(",") || ["", ""];

    // URL의 slug[1]로 activeTab 초기화 (기본값: drivingLogs)
    const tabFromUrl = slug && slug[1] ? slug[1] : "drivingLogs";
    const [activeTab, setActiveTab] = useState(tabFromUrl);

    // 모바일 무한 스크롤 state
    const [mobileRecords, setMobileRecords] =
        useState<VehicleRecord[]>(initialRecords);
    const [mobileReservations, setMobileReservations] =
        useState<VehicleReservation[]>(initialReservations);
    const [recordPage, setRecordPage] = useState(0);
    const [reservationPage, setReservationPage] = useState(0);
    const [hasMoreRecords, setHasMoreRecords] = useState(false);
    const [hasMoreReservations, setHasMoreReservations] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    // 페이징 관련 state (클라이언트에서 페이징 UI만 관리)
    const [recordCurrentPage, setRecordCurrentPage] = useState(1);
    const recordItemsPerPage = 10;
    const [excludeCreatedDate, setExcludeCreatedDate] = useState(false);

    const [reservationCurrentPage, setReservationCurrentPage] = useState(1);
    const reservationItemsPerPage = 10;

    // 데이터 새로고침 함수
    const refreshData = async () => {
        try {
            const params = {
                vehicleId: String(content.id),
                page: "0", // 항상 첫 페이지로
                size: "10",
            };

            if (activeTab === "drivingLogs") {
                const response = await axiosInstance.get(
                    `/vrs/vehicle-records/find/all`,
                    { params },
                );
                setMobileRecords(response.data.content || []);
            } else if (activeTab === "reservations") {
                const response = await axiosInstance.get(
                    `/vrs/vehicle-reservations/find/all`,
                    { params },
                );
                setMobileReservations(response.data.content || []);
            }

            // 서버 컴포넌트 revalidate (차량 정보 포함)
            setTimeout(() => {
                route.replace(
                    window.location.pathname + window.location.search,
                );
            }, 100);
        } catch (error) {
            console.error("데이터 새로고침 실패:", error);
        }
    };

    // 검색 옵션
    const recordSearchOptions = [{ value: "employeeName", label: "사용자" }];

    const reservationSearchOptions = [{ value: "all", label: "예약자+목적지" }];
    // 정렬 옵션
    const recordSortOptions = [
        { value: "currentDistance", label: "총 운행 거리순" },
        { value: "id", label: "작성일순" },
    ];

    const reservationSortOptions = [
        { value: "startDate", label: "시작일시" },
        { value: "endDate", label: "종료일시" },
        { value: "id", label: "작성일순" },
    ];

    // 검색 핸들러
    const handleRecordSearch = (
        type: string,
        keyword: string,
        sortField?: string,
        sortOrder?: string,
        startDate?: string,
        endDate?: string,
    ) => {
        setRecordCurrentPage(1);

        // URL에 검색, 정렬 및 날짜 필터 파라미터 추가
        const params = new URLSearchParams();
        if (keyword) {
            // 필드명을 직접 키로 사용 (예: employee.name=명지애)
            params.set(type, keyword);
        }
        if (sortField && sortOrder) {
            params.set("sort", `${sortField}.${sortOrder.toLowerCase()}`);
        }
        if (startDate && endDate) {
            params.set("useDate<>", `${startDate},${endDate}`);
        }
        const queryString = params.toString();
        route.push(
            `/vehicles/${content.id}/drivingLogs${queryString ? `?${queryString}` : ""}`,
        );
    };

    const handleReservationSearch = (
        type: string,
        keyword: string,
        sortField?: string,
        sortOrder?: string,
        startDate?: string,
        endDate?: string,
    ) => {
        setReservationCurrentPage(1);

        // URL에 검색 및 정렬 파라미터 추가
        const params = new URLSearchParams();
        if (keyword) {
            // 예약자, 부서, 목적지로 동시 검색
            params.set("employeeName", keyword);
            params.set("affiliationName", keyword);
            params.set("destination", keyword);
        }
        if (sortField && sortOrder) {
            params.set("sort", `${sortField}.${sortOrder.toLowerCase()}`);
        }
        if (startDate && endDate) {
            params.set("startDate<>", `${startDate},${endDate}`);
        }
        const queryString = params.toString();
        route.push(
            `/vehicles/${content.id}/reservations${queryString ? `?${queryString}` : ""}`,
        );
    };

    // 모바일 데이터 초기화
    useEffect(() => {
        setMobileRecords(initialRecords);
        setMobileReservations(initialReservations);
        setRecordPage(0);
        setReservationPage(0);

        const currentPage = Number(searchParams.get("page")) || 0;
        const currentSize = Number(searchParams.get("size")) || 10;

        if (activeTab === "drivingLogs") {
            const totalRecordPages = Math.ceil(
                recordTotalElements / currentSize,
            );
            setHasMoreRecords(currentPage < totalRecordPages - 1);
        } else {
            const totalReservationPages = Math.ceil(
                reservationTotalElements / currentSize,
            );
            setHasMoreReservations(currentPage < totalReservationPages - 1);
        }
    }, [
        initialRecords,
        initialReservations,
        activeTab,
        recordTotalElements,
        reservationTotalElements,
        searchParams,
    ]);

    // refreshKey 변경 시 데이터 다시 불러오기 (모달에서 create/edit/delete 후)
    const prevRefreshKey = useRef(refreshKey);
    useEffect(() => {
        // refreshKey가 실제로 증가했을 때만 데이터 다시 불러오기
        if (refreshKey > prevRefreshKey.current) {
            refreshData();
            prevRefreshKey.current = refreshKey;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    // 추가 데이터 로드
    const loadMoreData = useCallback(async () => {
        if (isLoading) return;

        const hasMore =
            activeTab === "drivingLogs" ? hasMoreRecords : hasMoreReservations;
        if (!hasMore) return;

        setIsLoading(true);
        const currentPage =
            activeTab === "drivingLogs" ? recordPage : reservationPage;
        const nextPage = currentPage + 1;

        try {
            const vehicleId = slug?.[0];
            const params: Record<string, string> = {
                vehicleId: vehicleId as string,
                page: nextPage.toString(),
                size: "10",
            };

            // URL에서 검색, 정렬, 필터 파라미터 가져오기
            const sort = searchParams.get("sort");
            const useDateRange = searchParams.get("useDate<>");
            const employeeName = searchParams.get("employeeName");
            const affiliationName = searchParams.get("affiliationName");
            const destination = searchParams.get("destination");

            if (sort) params.sort = sort;
            if (useDateRange) params["useDate<>"] = useDateRange;
            if (employeeName) params.employeeName = employeeName;
            if (affiliationName) params.affiliationName = affiliationName;
            if (destination) params.destination = destination;

            let url = "";
            if (activeTab === "drivingLogs") {
                url = `/vrs/vehicle-records/find/all`;
            } else {
                url = `/vrs/vehicle-reservations/find/all`;
            }

            const response = await axiosInstance.get(url, { params });
            const newContent = response.data.content || [];
            const pageInfo = response.data.page;

            if (activeTab === "drivingLogs") {
                setMobileRecords((prev) => [...prev, ...newContent]);
                setRecordPage(nextPage);
                setHasMoreRecords(pageInfo?.hasNext || false);
            } else {
                setMobileReservations((prev) => [...prev, ...newContent]);
                setReservationPage(nextPage);
                setHasMoreReservations(pageInfo?.hasNext || false);
            }
        } catch (error) {
            console.error("Failed to load more data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        isLoading,
        hasMoreRecords,
        hasMoreReservations,
        recordPage,
        reservationPage,
        activeTab,
        slug,
        searchParams,
    ]);

    // Intersection Observer
    useEffect(() => {
        const hasMore =
            activeTab === "drivingLogs" ? hasMoreRecords : hasMoreReservations;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMoreData();
                }
            },
            { threshold: 0.1 },
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [
        hasMoreRecords,
        hasMoreReservations,
        isLoading,
        loadMoreData,
        activeTab,
    ]);

    // 운행 일지 데이터 (모바일: 무한스크롤, 데스크탑: 서버 페이징)
    const records = mobileRecords;

    // 예약 내역 데이터 (모바일: 무한스크롤, 데스크탑: 서버 페이징)
    const reservations = mobileReservations;

    const tabs = [
        { id: "drivingLogs", label: "운행 일지 조회" },
        { id: "reservations", label: "차량 예약 내역 조회" },
    ];

    // 탭 변경 핸들러 - URL도 함께 업데이트
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        const vehicleId = slug?.[0];
        if (vehicleId) {
            route.push(`/vehicles/${vehicleId}/${tabId}`);
        }
    };

    // 서버에서 이미 필터링/페이징된 데이터를 받으므로 클라이언트 필터링 불필요
    // 받은 데이터를 그대로 사용
    const paginatedReservations = reservations;
    const paginatedRecords = records;
    console.log(records);
    // Record 클릭 핸들러 - 본인이 작성한 record만 수정 가능
    const handleRecordClick = (record: VehicleRecord) => {
        // 본인이 작성한 경우만 수정 가능
        const isOwnRecord =
            user &&
            record?.employee &&
            String(user.employeeNumber) ===
                String(record.employee.employeeNumber);

        if (!isOwnRecord) {
            return;
        }

        // modalStore 타입에 맞게 데이터 변환
        const recordDataForModal = {
            ...record,
            employee: {
                id: record.employee!.employeeNumber, // employeeNumber를 id로 사용
                name: record.employee!.name,
                affiliationName: record.employee!.affiliationName,
            },
        };

        openModal(
            "EDIT_RECORD",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            recordDataForModal as any,
        );
    };

    // Reservation 클릭 핸들러 - 본인이 작성한 예약만 수정 가능
    const handleReservationClick = (reservation: VehicleReservation) => {
        const isOwnReservation =
            user &&
            reservation?.employee &&
            String(user.employeeNumber) ===
                String(reservation.employee.employeeNumber);

        if (!isOwnReservation) {
            return;
        }

        openModal(
            "EDIT_RESERVATION",
            String(reservation.vehicle.id),
            undefined, // vehicleDistance
            reservation.startDate,
            reservation.endDate || "",
            {
                reservationId: reservation.id,
                destination: reservation.destination || "",
                content: reservation.content || "",
            },
        );
    };

    // Record 삭제 핸들러
    const handleRecordDelete = async (recordId: number) => {
        setAlert("confirm", "운행 내역을 삭제하시겠습니까?", async () => {
            try {
                await axiosInstance.delete(
                    `/vrs/vehicle-records/erase/${recordId}`,
                );

                // 클라이언트 상태 갱신
                await fetchCars();
                triggerRefresh();

                // 서버에서 최신 데이터 다시 불러오기
                await refreshData();

                setAlert("success", "운행 내역이 삭제되었습니다.");
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string }>;

                setAlert(
                    "error",
                    axiosError.response?.data?.detail || "삭제에 실패했습니다.",
                );
            }
        });
    };

    // Reservation 삭제 핸들러
    const handleReservationDelete = async (reservationId: number) => {
        setAlert("confirm", "예약을 삭제하시겠습니까?", async () => {
            try {
                await axiosInstance.delete(
                    `/vrs/vehicle-reservations/erase/${reservationId}`,
                );

                // 클라이언트 상태 갱신
                await fetchCars();
                triggerRefresh();

                // 서버에서 최신 데이터 다시 불러오기
                await refreshData();

                setAlert("success", "예약이 삭제되었습니다.");
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string }>;
                console.error("예약 삭제 실패:", error);
                setAlert(
                    "error",
                    axiosError.response?.data?.detail || "삭제에 실패했습니다.",
                );
            }
        });
    };
    // Excel 다운로드 핸들러
    const handleExcelDownload = async () => {
        const { Workbook } = await import("exceljs");
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet("운행일지");

        // 컬럼 정의 (작성일 제외 옵션 반영)
        const columns: { header: string; key: string; width: number }[] = [
            { header: "No.", key: "no", width: 5 },
            { header: "사용일자", key: "useDate", width: 12 },
        ];

        if (!excludeCreatedDate) {
            columns.push({ header: "작성일", key: "createdDate", width: 12 });
        }

        columns.push(
            { header: "부서", key: "dept", width: 20 },
            { header: "성명", key: "name", width: 10 },
            { header: "주행 전(km)", key: "before", width: 12 },
            { header: "주행 후(km)", key: "after", width: 12 },
            { header: "주행거리(km)", key: "total", width: 12 },
            { header: "출/퇴근용(km)", key: "commute", width: 12 },
            { header: "일반 업무용(km)", key: "business", width: 12 },
            { header: "비고", key: "content", width: 30 },
        );

        worksheet.columns = columns;

        // 헤더 스타일 적용
        worksheet.getRow(1).eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD3D3D3" },
            };
            cell.font = { bold: true, color: { argb: "FF000000" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // 데이터 추가
        records.forEach((record, index) => {
            const rowData: {
                no: number;
                useDate: string;
                createdDate?: string;
                dept?: string;
                name?: string;
                before?: number;
                after?: number;
                total?: number;
                commute?: number;
                business?: number;
                content?: string;
            } = {
                no: index + 1,
                useDate: record.useDate,
            };

            if (!excludeCreatedDate) {
                rowData.createdDate = record.createdDate;
            }

            rowData.dept = record.employee?.affiliationName || "-";
            rowData.name = record.employee?.name || "-";
            rowData.before = record.beforeDistance ?? 0;
            rowData.after = record.currentDistance ?? 0;
            rowData.total = record.totalDistance ?? 0;
            rowData.commute = record.commuteDistance ?? 0;
            rowData.business = record.businessDistance ?? 0;
            rowData.content = record.content || "-";

            const row = worksheet.addRow(rowData);

            // 데이터 행 스타일
            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" },
                };

                // employee가 없는 경우 빨간색 배경
                if (!record.employee) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFFEE2E2" }, // #fee2e2
                    };
                }
            });
        });

        // 파일 다운로드
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${content.number}_운행일지.xlsx`;
        link.click();
    };

    // slug가 없으면 (즉, /vehicles 경로) 안내 메시지 표시
    if (!slug || slug.length === 0) {
        return (
            <EmptyContainer>
                <EmptyText>좌측 목록에서 차량을 선택해주세요</EmptyText>
            </EmptyContainer>
        );
    }

    const vehicleId = Number(slug[0]);

    return (
        <Container>
            <Prev onClick={() => route.push(`/`)}>뒤로 가기</Prev>
            <VehicleCard>
                <CardHeader>
                    <HeaderLeft>
                        <Title>{content.number}</Title>
                        <Subtitle>{content.name}</Subtitle>
                    </HeaderLeft>
                    <BadgeButton>
                        <StatusBadge
                            status={content.vehicleStatus ?? "DRIVING"}
                        >
                            {content.vehicleStatus === "DRIVING"
                                ? "운행중"
                                : content.vehicleStatus === "INSPECTION"
                                  ? "정비중"
                                  : content.vehicleStatus === "BROKEN"
                                    ? "고장"
                                    : "차고"}
                        </StatusBadge>
                        <SettingButton
                            onClick={() => {
                                openModal("EDIT_VEHICLE", String(content.id));
                            }}
                        >
                            <Icon name="setting" size={20} />
                        </SettingButton>
                    </BadgeButton>
                </CardHeader>
                <InfoGrid>
                    <InfoItem>
                        <Label>차량 등록일</Label>
                        <Value>{content.registerDate}</Value>
                    </InfoItem>
                    <InfoItem>
                        <Label>운행 개시일</Label>
                        <Value>{content.drivingDate}</Value>
                    </InfoItem>
                    <InfoItem>
                        <Label>연료 유형</Label>
                        <Value>{FUEL_TYPE_MAP[content.fuelType]}</Value>
                    </InfoItem>
                    <InfoItem>
                        <Label>최근 검사일</Label>
                        <Value>{content.inspectionDate}</Value>
                    </InfoItem>
                    <InfoItem>
                        <Label>총 운행거리</Label>
                        <DistanceValue>
                            {content.distance
                                ? `${content.distance.toLocaleString()} km`
                                : "-"}
                            {content.missingDistance != null &&
                                content.missingDistance > 0 && (
                                    <MissingDistance>
                                        (누락:{" "}
                                        {content.missingDistance.toLocaleString()}{" "}
                                        km)
                                    </MissingDistance>
                                )}
                        </DistanceValue>
                    </InfoItem>
                    {content.content && (
                        <InfoItem style={{ gridColumn: "1 / -1" }}>
                            <Label>비고</Label>
                            <Value>{content.content}</Value>
                        </InfoItem>
                    )}
                </InfoGrid>
            </VehicleCard>

            <TabButtonContainer>
                <Tab
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
                <ButtonGroup>
                    <AddButton
                        title="차량 예약"
                        modalType="NEW_RESERVATION"
                        vehicleId={String(vehicleId)}
                    />
                    <AddButton
                        title="운행 내역 추가"
                        modalType="NEW_RECORD"
                        vehicleId={String(vehicleId)}
                        vehicleDistance={content.distance}
                    />
                </ButtonGroup>
            </TabButtonContainer>

            {activeTab === "reservations" && (
                <ContentBox>
                    <SearchBar
                        searchOptions={reservationSearchOptions}
                        onSearch={handleReservationSearch}
                        placeholder="검색어를 입력하세요"
                        sortOptions={reservationSortOptions}
                        showDateFilter={true}
                        initialStartDate={initialReservationStartDate}
                        initialEndDate={initialReservationEndDate}
                    />
                    <DesktopView>
                        <TableWrapper>
                            <Table>
                                <THead>
                                    <THeadRow>
                                        <TH>No.</TH>
                                        <TH>예약 시작일</TH>
                                        <TH>예약 종료일</TH>
                                        <TH>예약자</TH>
                                        <TH>부서</TH>
                                        <TH>목적지</TH>
                                        <TH>상태</TH>
                                    </THeadRow>
                                </THead>
                                <TBody>
                                    {paginatedReservations.length > 0 ? (
                                        paginatedReservations.map(
                                            (reservation, index) => {
                                                const isOwnReservation =
                                                    user &&
                                                    reservation?.employee &&
                                                    String(
                                                        user.employeeNumber,
                                                    ) ===
                                                        String(
                                                            reservation.employee
                                                                .employeeNumber,
                                                        );
                                                return (
                                                    <TRow
                                                        key={reservation.id}
                                                        onClick={() =>
                                                            handleReservationClick(
                                                                reservation,
                                                            )
                                                        }
                                                        style={{
                                                            cursor: isOwnReservation
                                                                ? "pointer"
                                                                : "default",
                                                        }}
                                                    >
                                                        <TD>{index + 1}</TD>
                                                        <TD>
                                                            {replaceDate(
                                                                reservation.startDate,
                                                            )}
                                                        </TD>
                                                        <TD>
                                                            {replaceDate(
                                                                reservation?.endDate ||
                                                                    "",
                                                            ) || "-"}
                                                        </TD>
                                                        <TD>
                                                            {reservation
                                                                .employee
                                                                ?.name || "-"}
                                                        </TD>
                                                        <TD>
                                                            {reservation
                                                                .employee
                                                                ?.affiliationName ||
                                                                "-"}
                                                        </TD>
                                                        <TD>
                                                            {reservation.destination ||
                                                                "-"}
                                                        </TD>
                                                        <TD>
                                                            <StatusBadge
                                                                status={
                                                                    reservation.status ||
                                                                    "ETC"
                                                                }
                                                            >
                                                                {reservation.status ===
                                                                "FINISH"
                                                                    ? "종료"
                                                                    : reservation.status ===
                                                                        "DRIVING"
                                                                      ? "운행중"
                                                                      : "대기"}
                                                            </StatusBadge>
                                                        </TD>
                                                    </TRow>
                                                );
                                            },
                                        )
                                    ) : (
                                        <TRow>
                                            <TD colSpan={7}>
                                                예약 내역이 없습니다
                                            </TD>
                                        </TRow>
                                    )}
                                </TBody>
                            </Table>
                        </TableWrapper>
                        <AdvancedPagination
                            totalItems={reservationTotalElements}
                            defaultPageSize={10}
                            pageSizeOptions={[10, 20, 50, 0]}
                        />
                    </DesktopView>
                    <CardView>
                        {paginatedReservations.length > 0 ? (
                            <>
                                <CardGrid>
                                    {paginatedReservations.map(
                                        (reservation) => {
                                            const isOwnReservation =
                                                user &&
                                                reservation?.employee &&
                                                String(user.employeeNumber) ===
                                                    String(
                                                        reservation?.employee
                                                            ?.employeeNumber,
                                                    );
                                            return (
                                                <ReservationCard
                                                    key={reservation.id}
                                                    onClick={() =>
                                                        handleReservationClick(
                                                            reservation,
                                                        )
                                                    }
                                                    style={{
                                                        cursor: isOwnReservation
                                                            ? "pointer"
                                                            : "default",
                                                    }}
                                                >
                                                    <CardHeader>
                                                        <ReservationTitle>
                                                            예약 내용
                                                        </ReservationTitle>
                                                        <StatusBadge
                                                            status={
                                                                reservation.status ||
                                                                "ETC"
                                                            }
                                                        >
                                                            {reservation.status ===
                                                            "FINISH"
                                                                ? "종료"
                                                                : reservation.status ===
                                                                    "WAITING"
                                                                  ? "대기"
                                                                  : reservation.status ===
                                                                      "DRIVING"
                                                                    ? "진행중"
                                                                    : reservation.status ||
                                                                      "-"}
                                                        </StatusBadge>
                                                    </CardHeader>
                                                    <ReservationContent>
                                                        <ReservationInfoRow>
                                                            <ReservationLabel>
                                                                기간
                                                            </ReservationLabel>
                                                            <ReservationValue>
                                                                {replaceDate(
                                                                    reservation.startDate,
                                                                )}{" "}
                                                                ~{" "}
                                                                {replaceDate(
                                                                    reservation.endDate ||
                                                                        "",
                                                                ) || "-"}
                                                            </ReservationValue>
                                                        </ReservationInfoRow>
                                                        <ReservationInfoRow>
                                                            <ReservationLabel>
                                                                예약자
                                                            </ReservationLabel>
                                                            <ReservationValue>
                                                                {reservation
                                                                    .employee
                                                                    ?.name ||
                                                                    "-"}{" "}
                                                                (
                                                                {reservation
                                                                    .employee
                                                                    ?.affiliationName ||
                                                                    "-"}
                                                                )
                                                            </ReservationValue>
                                                        </ReservationInfoRow>
                                                        <ReservationInfoRow>
                                                            <ReservationLabel>
                                                                목적
                                                            </ReservationLabel>
                                                            <ReservationValue>
                                                                {reservation.destination ||
                                                                    "-"}
                                                            </ReservationValue>
                                                        </ReservationInfoRow>
                                                    </ReservationContent>
                                                    {isOwnReservation && (
                                                        <ReservationFooter>
                                                            <ReservationDeleteButton
                                                                onClick={() =>
                                                                    handleReservationDelete(
                                                                        reservation.id,
                                                                    )
                                                                }
                                                            >
                                                                삭제
                                                            </ReservationDeleteButton>
                                                        </ReservationFooter>
                                                    )}
                                                </ReservationCard>
                                            );
                                        },
                                    )}
                                </CardGrid>
                                {isLoading && (
                                    <LoadingMessage>로딩 중...</LoadingMessage>
                                )}
                                <div
                                    ref={observerTarget}
                                    style={{ height: "20px" }}
                                />
                            </>
                        ) : (
                            <EmptyStateCard>
                                예약 내역이 없습니다
                            </EmptyStateCard>
                        )}
                    </CardView>
                </ContentBox>
            )}

            {activeTab === "drivingLogs" && (
                <ContentBox>
                    <SearchBar
                        searchOptions={recordSearchOptions}
                        onSearch={handleRecordSearch}
                        placeholder="검색어를 입력하세요"
                        sortOptions={recordSortOptions}
                        showDateFilter={true}
                        initialStartDate={initialRecordStartDate}
                        initialEndDate={initialRecordEndDate}
                    />
                    <ExcelDownloadWrapper>
                        <CheckboxWrapper>
                            <input
                                type="checkbox"
                                id="excludeCreatedDate"
                                checked={excludeCreatedDate}
                                onChange={(e) =>
                                    setExcludeCreatedDate(e.target.checked)
                                }
                            />
                            <CheckboxLabel htmlFor="excludeCreatedDate">
                                작성일 제외
                            </CheckboxLabel>
                        </CheckboxWrapper>
                        <ExcelButton onClick={handleExcelDownload}>
                            Excel 다운로드
                        </ExcelButton>
                    </ExcelDownloadWrapper>
                    <DesktopView>
                        <TableWrapper>
                            <BorderedTable>
                                <THead>
                                    <THeadRow>
                                        <BorderedTH rowSpan={3}>No.</BorderedTH>
                                        <BorderedTH rowSpan={3}>
                                            사용일자
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={3}
                                            style={{ width: "130px" }}
                                        >
                                            작성일시
                                        </BorderedTH>
                                        <BorderedTH colSpan={2}>
                                            사용자
                                        </BorderedTH>
                                        <BorderedTH colSpan={5}>
                                            운행내역
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={3}
                                            style={{ width: "200px" }}
                                        >
                                            비고
                                        </BorderedTH>
                                    </THeadRow>
                                    <THeadRow>
                                        <BorderedTH rowSpan={2}>
                                            부서
                                        </BorderedTH>
                                        <BorderedTH rowSpan={2}>
                                            성명
                                        </BorderedTH>
                                        <BorderedTH rowSpan={2}>
                                            주행 전(km)
                                        </BorderedTH>
                                        <BorderedTH rowSpan={2}>
                                            주행 후(km)
                                        </BorderedTH>
                                        <BorderedTH rowSpan={2}>
                                            주행거리(km)
                                        </BorderedTH>
                                        <BorderedTH colSpan={2}>
                                            업무용 사용거리
                                        </BorderedTH>
                                    </THeadRow>
                                    <THeadRow>
                                        <BorderedTH style={{ width: "130px" }}>
                                            {" "}
                                            출/퇴근용(km)
                                        </BorderedTH>
                                        <BorderedTH style={{ width: "130px" }}>
                                            일반 업무용(km)
                                        </BorderedTH>
                                    </THeadRow>
                                </THead>
                                <TBody>
                                    {paginatedRecords.length > 0 ? (
                                        paginatedRecords.map(
                                            (record, index) => {
                                                const isOwnRecord =
                                                    !!user &&
                                                    !!record?.employee &&
                                                    String(
                                                        user.employeeNumber,
                                                    ) ===
                                                        String(
                                                            record.employee
                                                                .employeeNumber,
                                                        );
                                                return (
                                                    <ClickableRow
                                                        key={record.id}
                                                        onClick={() => {
                                                            handleRecordClick(
                                                                record,
                                                            );
                                                        }}
                                                        isClickable={
                                                            isOwnRecord
                                                        }
                                                        hasNoEmployee={
                                                            !record.employee
                                                        }
                                                    >
                                                        <BorderedTD>
                                                            {index + 1}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {record.useDate}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {
                                                                record.createdDate?.split(
                                                                    "T",
                                                                )[0]
                                                            }{" "}
                                                            &nbsp;
                                                            {record.createdDate
                                                                ?.split("T")[1]
                                                                .split(":")
                                                                .slice(0, 2)
                                                                .join(":")}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {record.employee
                                                                ?.affiliationName ||
                                                                "-"}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {record.employee
                                                                ?.name || "-"}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {(
                                                                record.beforeDistance ??
                                                                0
                                                            ).toLocaleString()}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {(
                                                                record.currentDistance ??
                                                                0
                                                            ).toLocaleString()}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {(
                                                                record.totalDistance ??
                                                                0
                                                            ).toLocaleString()}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {(
                                                                record.commuteDistance ??
                                                                0
                                                            ).toLocaleString()}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {(
                                                                record.businessDistance ??
                                                                0
                                                            ).toLocaleString()}
                                                        </BorderedTD>
                                                        <BorderedTD>
                                                            {record.content ||
                                                                "-"}
                                                        </BorderedTD>
                                                    </ClickableRow>
                                                );
                                            },
                                        )
                                    ) : (
                                        <TRow>
                                            <BorderedTD colSpan={11}>
                                                운행 내역이 없습니다
                                            </BorderedTD>
                                        </TRow>
                                    )}
                                </TBody>
                            </BorderedTable>
                        </TableWrapper>
                        <AdvancedPagination
                            totalItems={recordTotalElements}
                            defaultPageSize={10}
                            pageSizeOptions={[10, 20, 50, 0]}
                        />
                    </DesktopView>
                    <CardView>
                        {paginatedRecords.length > 0 ? (
                            <>
                                <CardGrid>
                                    {paginatedRecords.map((record, index) => (
                                        <RecordCard
                                            key={record.id}
                                            record={record}
                                            index={index}
                                            onEditClick={handleRecordClick}
                                            onDeleteClick={handleRecordDelete}
                                            currentUserEmployeeNumber={
                                                user?.employeeNumber
                                            }
                                        />
                                    ))}
                                </CardGrid>
                                {isLoading && (
                                    <LoadingMessage>로딩 중...</LoadingMessage>
                                )}
                                <div
                                    ref={observerTarget}
                                    style={{ height: "20px" }}
                                />
                            </>
                        ) : (
                            <EmptyStateCard>
                                운행 내역이 없습니다
                            </EmptyStateCard>
                        )}
                    </CardView>
                </ContentBox>
            )}
        </Container>
    );
};

export default Client;

// Styled Components

const DesktopView = styled.div`
    display: block;
    margin-top: 1rem;
    @media (max-width: 1023px) {
        display: none;
    }
`;

const CardView = styled.div`
    display: none;

    @media (max-width: 1023px) {
        display: block;
    }
`;

const ContentBox = styled.div`
    background-color: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-top: 1rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const Container = styled.div`
    padding: 1.5rem;
    width: 100%;
    height: calc(100vh - var(--header-height) - 3rem);
    background-color: #f9fafb;

    @media (max-width: 1023px) {
        height: auto;
        padding-bottom: calc(
            100px + env(safe-area-inset-bottom)
        ); /* NavBar 높이(65px) + 여유 공간 + Safari 하단 여백 */
    }
`;

const Prev = styled.button`
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 0.375rem;

    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    background-color: #fff;
    border: 1px solid #dedede;
`;

const VehicleCard = styled.div`
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    width: 100%;
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid #f3f4f6;
`;

const SettingButton = styled.button`
    background: none;
    border: none;
    margin-top: 0.5rem;

    display: flex;
    justify-content: right;

    cursor: pointer;
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const BadgeButton = styled.div`
    display: flex;
    flex-direction: column;
`;

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
`;

const Subtitle = styled.h2`
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
    font-weight: 500;
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.25rem;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

const InfoItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const Label = styled.span`
    font-size: 0.75rem;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const Value = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 600;
`;

const DistanceValue = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const MissingDistance = styled.span`
    font-size: 0.75rem;
    color: #dc2626;
    font-weight: 600;
`;

const StatusBadge = styled.span<{ status?: string }>`
    display: inline-block;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${(props) => {
        switch (props.status) {
            case "FINISH":
                return "#d1fae5";
            case "wAITING":
                return "#fef3c7";
            case "DRIVING":
                return "#fee2e2";
            default:
                return "#f3f4f6";
        }
    }};
    color: ${(props) => {
        switch (props.status) {
            case "FINISH":
                return "#065f46";
            case "wAITING":
                return "#92400e";
            case "DRIVING":
                return "#991b1b";
            default:
                return "#374151";
        }
    }};
`;

const EmptyContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50vh;
`;

const EmptyText = styled.p`
    font-size: 1.125rem;
    color: #9ca3af;
`;

// Tab과 버튼을 같은 선상에 배치하는 컨테이너
const TabButtonContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 1.5rem;

    @media (max-width: 1023px) {
        flex-direction: column;
        align-items: stretch;
        padding-bottom: 0.5rem;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    align-items: center;

    @media (max-width: 1023px) {
        width: 100%;
        justify-content: flex-end;
        margin-bottom: 0.5rem;
    }
`;

// Bordered Table Components (client.tsx에서만 사용)
const BorderedTable = styled(Table)`
    border-collapse: collapse;

    th,
    td {
        border: 1px solid #d1d5db;
    }
`;

const BorderedTH = styled(TH)`
    border: 1px solid #d1d5db;
`;

const BorderedTD = styled(TD)`
    border: 1px solid #d1d5db;
`;

// Card View Components
const CardGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;

    @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 1024px) {
        grid-template-columns: 1fr;
        margin-bottom: 0;
    }
`;

const EmptyStateCard = styled.div`
    background: white;
    border-radius: 0.75rem;
    padding: 3rem 1rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const LoadingMessage = styled.div`
    padding: 1rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
`;

// Reservation Card Components
const ReservationCard = styled.div`
    background: white;
    border-radius: 0.75rem;
    padding: 1.25rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const ReservationTitle = styled.h3`
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
`;

const ReservationContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const ReservationInfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ReservationLabel = styled.span`
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
`;

const ReservationValue = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 600;
`;

const ReservationFooter = styled.div`
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
`;

const ReservationDeleteButton = styled.button`
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #ef4444;
    background-color: white;
    border: 1px solid #ef4444;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background-color: #fef2f2;
    }
`;

// Excel Download Components
const ExcelDownloadWrapper = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
`;

const CheckboxWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const CheckboxLabel = styled.label`
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    user-select: none;
`;

const ExcelButton = styled.button`
    padding: 0.5rem 1.5rem;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease;
    white-space: nowrap;

    &:hover {
        background-color: #059669;
    }

    &:active {
        transform: scale(0.98);
    }
`;

const ClickableRow = styled(TRow)<{
    isClickable: boolean;
    hasNoEmployee?: boolean;
}>`
    cursor: ${(props) => (props.isClickable ? "pointer" : "default")};
    transition: background-color 0.15s ease;
    background-color: ${(props) =>
        props.hasNoEmployee ? "#fee2e2" : "transparent"};

    &:hover {
        background-color: ${(props) =>
            props.hasNoEmployee
                ? "#fecaca"
                : props.isClickable
                  ? "#f3f4f6"
                  : "transparent"};
    }
`;
