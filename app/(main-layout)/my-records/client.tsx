"use client";

import { useRouter, usePathname } from "next/navigation";
import useUserStore from "@/lib/stores/userStore";
import { replaceDate } from "@/lib/utils/replaceDateString";
import styled from "@emotion/styled";
import Tab from "@/components/features/Tab";
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
import { MyRecord, VehicleRecord } from "./[[...slug]]/page";
import AdvancedPagination from "@/components/common/AdvancedPagination";
import { useState, useEffect, useRef, useCallback } from "react";
import axiosInstance from "@/lib/axios";
import { useModalStore } from "@/lib/stores/modalStore";
import useAlertStore from "@/lib/stores/alertStore";

interface MyeRecordsClientProps {
    content: MyRecord[] | VehicleRecord[] | [];
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    hasNext?: boolean;
}

const MyRecordsClient = ({
    content,
    page = 0,
    size = 0,
    totalElements = 0,
    totalPages = 0,
    hasNext = false,
}: MyeRecordsClientProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useUserStore();
    const { openModal, refreshKey } = useModalStore();
    const employeeId = user?.employeeNumber || 0;

    // 모바일 무한 스크롤을 위한 상태
    const [mobileData, setMobileData] = useState<MyRecord[] | VehicleRecord[]>(
        content,
    );
    const [mobilePage, setMobilePage] = useState(
        typeof page === "number" ? page : 0,
    );
    const [hasMore, setHasMore] = useState(hasNext);

    const { setAlert } = useAlertStore();

    const [isLoading, setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const today = new Date();
    const kstDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(today);

    // 현재 연도의 1월 1일과 12월 31일
    console.log("content", content);
    const currentYear = today.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // URL에서 현재 탭 및 날짜 추출
    const pathSegments = pathname.split("/");
    const type = pathSegments[3]; // /my-records/{id}/{type}/...

    // 현재 탭 파악
    const activeTab = (() => {
        if (type === "logs") return "drivingLogs";
        if (type === "reservation") return "reservations";
        return "reservations";
    })();

    // 현재 날짜 추출 (탭에 따라 기본값 다름)
    const currentStartDate = pathSegments[4] || yearStart;
    const currentEndDate = pathSegments[5] || yearEnd;

    // 탭 변경 시 URL 업데이트
    const handleTabChange = (tabId: string) => {
        if (tabId === "reservations") {
            router.push(
                `/my-records/${employeeId}/reservation/${yearStart}/${yearEnd}`,
            );
        } else if (tabId === "drivingLogs") {
            router.push(
                `/my-records/${employeeId}/logs/${yearStart}/${yearEnd}`,
            );
        }
    };

    // 날짜 변경 핸들러 (예약 내역용)
    const handleReservationDateChange = (start: string, end: string) => {
        router.push(`/my-records/${employeeId}/reservation/${start}/${end}`);
    };

    // 날짜 변경 핸들러 (운행일지용)
    const handleLogsDateChange = (start: string, end: string) => {
        router.push(`/my-records/${employeeId}/logs/${start}/${end}`);
    };

    // 데이터 새로고침 함수
    const refreshData = async () => {
        try {
            const endpoint =
                activeTab === "drivingLogs"
                    ? `/vrs/vehicle-records/find/all?employeeNumber=${employeeId}`
                    : `/vrs/vehicle-reservations/my`;

            const params: Record<string, string> = {
                page: "0",
                size: "10",
            };

            if (activeTab === "drivingLogs") {
                params["useDate<>"] = `${currentStartDate},${currentEndDate}`;
            } else {
                params["startDate<>"] = `${currentStartDate},${currentEndDate}`;
            }

            const response = await axiosInstance.get(endpoint, { params });

            setMobileData(response.data.content || []);

            setTimeout(() => {
                router.replace(
                    window.location.pathname + window.location.search,
                );
            }, 100);
        } catch (error) {
            console.error("데이터 새로고침 실패:", error);
        }
    };

    // Record 클릭 핸들러 - 운행 일지 수정
    const handleRecordClick = (record: VehicleRecord) => {
        openModal(
            "EDIT_RECORD",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            record as any,
        );
    };

    // Reservation 클릭 핸들러 - 예약 수정
    const handleReservationClick = (reservation: MyRecord) => {
        openModal(
            "EDIT_RESERVATION",
            String(reservation.vehicle.id),
            undefined,
            reservation.startDate,
            reservation.endDate || "",
            {
                reservationId: reservation.id,
                destination: reservation.destination || "",
                content: reservation.content || "",
            },
        );
    };

    // refreshKey 변경 시 데이터 다시 불러오기
    const prevRefreshKey = useRef(-1);
    useEffect(() => {
        console.log("🔄 [my-records] refreshKey changed:", {
            current: refreshKey,
            prev: prevRefreshKey.current,
        });
        if (prevRefreshKey.current === -1) {
            prevRefreshKey.current = refreshKey;
            return;
        }
        if (refreshKey > prevRefreshKey.current) {
            console.log("✅ [my-records] Calling refreshData()");
            refreshData();
            prevRefreshKey.current = refreshKey;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    // 모바일 데이터 초기화 (날짜나 탭 변경 시에만)
    useEffect(() => {
        console.log(
            "📱 [MyRecords useEffect] Resetting mobile data due to date/tab change:",
            {
                contentLength: content?.length,
                currentStartDate,
                currentEndDate,
                activeTab,
                page,
            },
        );
        setMobileData(content || []);
        setMobilePage(typeof page === "number" ? page : 0);
        setHasMore(hasNext || false);
        isLoadingRef.current = false; // 리셋 시 로딩 상태도 초기화
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStartDate, currentEndDate, activeTab]);

    // 추가 데이터 로드 함수
    const loadMoreData = useCallback(async () => {
        if (isLoadingRef.current || !hasMore) {
            console.log("📱 [loadMoreData] Skipped:", {
                isLoading: isLoadingRef.current,
                hasMore,
            });
            return;
        }

        console.log(
            "📱 [loadMoreData] Starting load for page:",
            mobilePage + 1,
        );
        isLoadingRef.current = true;
        setIsLoading(true);
        const nextPage = mobilePage + 1;

        try {
            let url = "";
            const params: Record<string, string> = {
                page: nextPage.toString(),
                size: "10",
            };

            if (activeTab === "reservations") {
                url = `/vrs/vehicle-reservations/my`;
                params["startDate<>"] = `${currentStartDate},${currentEndDate}`;
            } else {
                url = `/vrs/vehicle-records/find/all`;
                params["employeeNumber"] = String(employeeId);
                params["useDate<>"] = `${currentStartDate},${currentEndDate}`;
            }

            const response = await axiosInstance.get(url, { params });
            const newContent = response.data.content || [];
            const pageInfo = response.data.page;

            // 중복 제거
            const existingIds = new Set(
                mobileData.map((item: MyRecord | VehicleRecord) => item.id),
            );
            const uniqueNewContent = newContent.filter(
                (item: MyRecord | VehicleRecord) => !existingIds.has(item.id),
            );

            // 중복 데이터만 있다면 무한 루프 방지
            if (uniqueNewContent.length === 0) {
                setHasMore(false);
            } else {
                setMobileData((prev) => [...prev, ...uniqueNewContent]);
                setMobilePage(nextPage);
                setHasMore(pageInfo?.hasNext || false);
            }
        } catch (error) {
            console.error("Failed to load more data:", error);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mobilePage, employeeId, activeTab, currentStartDate, currentEndDate]);

    // Intersection Observer 설정
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMore &&
                    !isLoadingRef.current
                ) {
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
    }, [hasMore, isLoading, loadMoreData]);

    const tabs = [
        { id: "reservations", label: "예약 내역 조회" },
        { id: "drivingLogs", label: "운행 일지 내역 조회" },
    ];

    const handlePull = () => {
        axiosInstance
            .get(`/vrs/employees/pull/all`)
            .then(() => {
                setAlert("success", "성공하였습니다");
            })
            .catch(() => {
                setAlert("error", "실패하였습니다.");
            });
    };

    return (
        <Container>
            <Prev onClick={() => router.push(`/`)}>뒤로 가기</Prev>
            {user?.affiliationName?.includes("Software") && (
                <Pull onClick={handlePull}>vrs pull </Pull>
            )}

            <Header>
                <Title>내 기록</Title>
            </Header>

            <TabWrapper>
                <Tab
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            </TabWrapper>

            {activeTab === "reservations" && (
                <>
                    <DateFilterWrapper>
                        <DateInputGroup>
                            <DateLabel>시작일</DateLabel>
                            <DateInput
                                type="date"
                                value={currentStartDate}
                                onChange={(e) =>
                                    handleReservationDateChange(
                                        e.target.value,
                                        currentEndDate,
                                    )
                                }
                            />
                        </DateInputGroup>
                        <DateSeparator>~</DateSeparator>
                        <DateInputGroup>
                            <DateLabel>종료일</DateLabel>
                            <DateInput
                                type="date"
                                value={currentEndDate}
                                onChange={(e) =>
                                    handleReservationDateChange(
                                        currentStartDate,
                                        e.target.value,
                                    )
                                }
                            />
                        </DateInputGroup>
                    </DateFilterWrapper>
                    <DesktopView>
                        <TableWrapper>
                            <Table>
                                <THead>
                                    <THeadRow>
                                        <TH>No.</TH>
                                        <TH>차량번호</TH>
                                        <TH>시작일</TH>
                                        <TH>종료일</TH>
                                        <TH>목적지</TH>
                                        <TH>상태</TH>
                                        <TH></TH>
                                    </THeadRow>
                                </THead>
                                <TBody>
                                    {content && content.length > 0 ? (
                                        (content as MyRecord[]).map(
                                            (reservation, index) => (
                                                <TRow
                                                    key={reservation.id}
                                                    onClick={() =>
                                                        handleReservationClick(
                                                            reservation,
                                                        )
                                                    }
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <TD>{index + 1}</TD>
                                                    <TD>
                                                        {reservation.vehicle
                                                            ?.number || "-"}
                                                    </TD>

                                                    <TD>
                                                        {replaceDate(
                                                            reservation.startDate,
                                                        )}
                                                    </TD>
                                                    <TD>
                                                        {replaceDate(
                                                            reservation.endDate,
                                                        )}
                                                    </TD>
                                                    <TD>
                                                        {
                                                            reservation.destination
                                                        }
                                                    </TD>
                                                    <TD>
                                                        <StatusBadge
                                                            status={
                                                                reservation.status
                                                            }
                                                        >
                                                            {reservation.status ===
                                                            "FINISH"
                                                                ? "완료"
                                                                : reservation.status ===
                                                                    "WAITING"
                                                                  ? "대기"
                                                                  : reservation.status ===
                                                                      "DRIVE"
                                                                    ? "진행중"
                                                                    : "-"}
                                                        </StatusBadge>
                                                    </TD>
                                                    <TD></TD>
                                                </TRow>
                                            ),
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
                            totalItems={totalElements || 0}
                            defaultPageSize={10}
                            pageSizeOptions={[10, 20, 50, 100, 0]}
                        />
                    </DesktopView>
                    <MobileView>
                        {mobileData && mobileData.length > 0 ? (
                            <>
                                <CardGrid>
                                    {(mobileData as MyRecord[]).map(
                                        (reservation) => {
                                            const isFinished =
                                                reservation.status === "FINISH";
                                            const canEdit =
                                                reservation.status ===
                                                    "DRIVING" ||
                                                reservation.status ===
                                                    "WAITING";

                                            return (
                                                <ReservationCard
                                                    key={reservation.id}
                                                    isFinished={isFinished}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isFinished) return;
                                                        if (canEdit) {
                                                            openModal(
                                                                "EDIT_RESERVATION",
                                                                reservation.vehicle.id.toString(),
                                                                undefined,
                                                                reservation.startDate,
                                                                reservation.endDate ||
                                                                    undefined,
                                                                {
                                                                    reservationId:
                                                                        reservation.id,
                                                                    destination:
                                                                        reservation.destination ||
                                                                        "",
                                                                    content:
                                                                        reservation.content ||
                                                                        "",
                                                                },
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <CardHeader>
                                                        <CardTitle>
                                                            {reservation.vehicle
                                                                ?.number || "-"}
                                                        </CardTitle>
                                                        <BadgeGroup>
                                                            <ReservationStatusBadge
                                                                status={
                                                                    reservation.status
                                                                }
                                                            >
                                                                {reservation.status ===
                                                                "WAITING"
                                                                    ? "대기중"
                                                                    : reservation.status ===
                                                                        "DRIVE"
                                                                      ? "진행중"
                                                                      : reservation.status ===
                                                                          "FINISH"
                                                                        ? "완료"
                                                                        : reservation.status}
                                                            </ReservationStatusBadge>
                                                            <UsageTypeBadge
                                                                status={
                                                                    reservation.usageType
                                                                }
                                                            >
                                                                {reservation.usageType ===
                                                                "BUSINESS"
                                                                    ? "업무용"
                                                                    : reservation.usageType ===
                                                                        "COMMUTE"
                                                                      ? "출퇴근용"
                                                                      : reservation.usageType}
                                                            </UsageTypeBadge>
                                                        </BadgeGroup>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <InfoRow>
                                                            <Label>기간</Label>
                                                            <Value>
                                                                {replaceDate(
                                                                    reservation.startDate,
                                                                )}{" "}
                                                                ~{" "}
                                                                {replaceDate(
                                                                    reservation.endDate,
                                                                )}
                                                            </Value>
                                                        </InfoRow>
                                                        <InfoRow>
                                                            <Label>
                                                                목적지
                                                            </Label>
                                                            <Value>
                                                                {
                                                                    reservation.destination
                                                                }
                                                            </Value>
                                                        </InfoRow>
                                                    </CardContent>
                                                    {!isFinished && (
                                                        <CardFooter>
                                                            <DeleteButton
                                                                onClick={(
                                                                    e: React.MouseEvent,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    setAlert(
                                                                        "confirm",
                                                                        "예약을 취소하시겠습니까?",
                                                                        async () => {
                                                                            try {
                                                                                await axiosInstance.delete(
                                                                                    `/vrs/vehicle-reservations/erase/${reservation.id}`,
                                                                                );
                                                                                setAlert(
                                                                                    "success",
                                                                                    "예약이 취소되었습니다.",
                                                                                );
                                                                                refreshData();
                                                                            } catch (error) {
                                                                                setAlert(
                                                                                    "error",
                                                                                    "예약 취소에 실패했습니다.",
                                                                                );
                                                                            }
                                                                        },
                                                                    );
                                                                }}
                                                            >
                                                                삭제
                                                            </DeleteButton>
                                                        </CardFooter>
                                                    )}
                                                </ReservationCard>
                                            );
                                        },
                                    )}
                                </CardGrid>
                                {hasMore && (
                                    <LoadingTrigger ref={observerTarget} />
                                )}
                                {isLoading && (
                                    <LoadingIndicator>
                                        <Spinner />
                                        <LoadingText>로딩 중...</LoadingText>
                                    </LoadingIndicator>
                                )}
                            </>
                        ) : (
                            <EmptyState>예약 내역이 없습니다</EmptyState>
                        )}
                    </MobileView>
                </>
            )}

            {activeTab === "drivingLogs" && (
                <>
                    <DateFilterWrapper>
                        <DateInputGroup>
                            <DateLabel>시작일</DateLabel>
                            <DateInput
                                type="date"
                                value={currentStartDate}
                                onChange={(e) =>
                                    handleLogsDateChange(
                                        e.target.value,
                                        currentEndDate,
                                    )
                                }
                            />
                        </DateInputGroup>
                        <DateSeparator>~</DateSeparator>
                        <DateInputGroup>
                            <DateLabel>종료일</DateLabel>
                            <DateInput
                                type="date"
                                value={currentEndDate}
                                onChange={(e) =>
                                    handleLogsDateChange(
                                        currentStartDate,
                                        e.target.value,
                                    )
                                }
                            />
                        </DateInputGroup>
                    </DateFilterWrapper>
                    <DesktopView>
                        <TableWrapper>
                            <BorderedTable>
                                <THead>
                                    <THeadRow>
                                        <BorderedTH
                                            rowSpan={3}
                                            style={{ width: "50px" }}
                                        >
                                            No.
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={3}
                                            style={{ width: "100px" }}
                                        >
                                            사용일자
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
                                        <BorderedTH
                                            rowSpan={2}
                                            style={{ width: "70px" }}
                                        >
                                            부서
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={2}
                                            style={{ width: "70px" }}
                                        >
                                            성명
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={2}
                                            style={{ width: "90px" }}
                                        >
                                            주행 전(km)
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={2}
                                            style={{ width: "90px" }}
                                        >
                                            주행 후(km)
                                        </BorderedTH>
                                        <BorderedTH
                                            rowSpan={2}
                                            style={{ width: "90px" }}
                                        >
                                            주행거리(km)
                                        </BorderedTH>
                                        <BorderedTH colSpan={2}>
                                            업무용 사용거리
                                        </BorderedTH>
                                    </THeadRow>
                                    <THeadRow>
                                        <BorderedTH style={{ width: "90px" }}>
                                            출/퇴근용(km)
                                        </BorderedTH>
                                        <BorderedTH style={{ width: "100px" }}>
                                            일반 업무용(km)
                                        </BorderedTH>
                                    </THeadRow>
                                </THead>
                                <TBody>
                                    {content && content.length > 0 ? (
                                        (content as VehicleRecord[]).map(
                                            (record, index) => (
                                                <ClickableRow
                                                    key={record.id}
                                                    onClick={() =>
                                                        handleRecordClick(
                                                            record,
                                                        )
                                                    }
                                                >
                                                    <BorderedTD>
                                                        {index + 1}
                                                    </BorderedTD>
                                                    <BorderedTD>
                                                        {record.useDate}
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
                                                        {record.beforeDistance?.toLocaleString() ||
                                                            0}
                                                    </BorderedTD>
                                                    <BorderedTD>
                                                        {record.currentDistance?.toLocaleString() ||
                                                            0}
                                                    </BorderedTD>
                                                    <BorderedTD>
                                                        {record.totalDistance?.toLocaleString() ||
                                                            0}
                                                    </BorderedTD>
                                                    <BorderedTD>
                                                        {record.commuteDistance?.toLocaleString() ||
                                                            0}
                                                    </BorderedTD>
                                                    <BorderedTD>
                                                        {record.businessDistance?.toLocaleString() ||
                                                            0}
                                                    </BorderedTD>
                                                    <BorderedTD>
                                                        {record.content || "-"}
                                                    </BorderedTD>
                                                </ClickableRow>
                                            ),
                                        )
                                    ) : (
                                        <TRow>
                                            <BorderedTD colSpan={10}>
                                                운행 일지 내역이 없습니다
                                            </BorderedTD>
                                        </TRow>
                                    )}
                                </TBody>
                            </BorderedTable>
                        </TableWrapper>
                        <AdvancedPagination
                            totalItems={totalElements || 0}
                            defaultPageSize={10}
                            pageSizeOptions={[10, 20, 50, 100, 0]}
                        />
                    </DesktopView>
                    <MobileView>
                        {mobileData && mobileData.length > 0 ? (
                            <>
                                <CardGrid>
                                    {(mobileData as VehicleRecord[]).map(
                                        (record) => {
                                            return (
                                                <RecordCardWrapper
                                                    key={record.id}
                                                    onClick={() =>
                                                        handleRecordClick(
                                                            record,
                                                        )
                                                    }
                                                >
                                                    <RecordCardHeader>
                                                        <RecordCardTitle>
                                                            {record.vehicle
                                                                ?.number || "-"}
                                                        </RecordCardTitle>
                                                        <RecordCardDate>
                                                            {replaceDate(
                                                                record.useDate,
                                                            )}
                                                        </RecordCardDate>
                                                    </RecordCardHeader>
                                                    <RecordCardBody>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                사용자
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.employee
                                                                    ?.name ||
                                                                    "-"}
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                부서
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.employee
                                                                    ?.affiliationName ||
                                                                    "-"}
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                주행 전
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.beforeDistance ||
                                                                    0}
                                                                km
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                주행 후
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.currentDistance ||
                                                                    0}
                                                                km
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                총 주행거리
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.totalDistance ||
                                                                    0}
                                                                km
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                출퇴근용
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.commuteDistance ||
                                                                    0}
                                                                km
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        <RecordCardRow>
                                                            <RecordCardLabel>
                                                                업무용
                                                            </RecordCardLabel>
                                                            <RecordCardValue>
                                                                {record.businessDistance ||
                                                                    0}
                                                                km
                                                            </RecordCardValue>
                                                        </RecordCardRow>
                                                        {record.content && (
                                                            <RecordCardRow>
                                                                <RecordCardLabel>
                                                                    비고
                                                                </RecordCardLabel>
                                                                <RecordCardValue>
                                                                    {
                                                                        record.content
                                                                    }
                                                                </RecordCardValue>
                                                            </RecordCardRow>
                                                        )}
                                                    </RecordCardBody>
                                                </RecordCardWrapper>
                                            );
                                        },
                                    )}
                                </CardGrid>
                                <div
                                    ref={observerTarget}
                                    style={{ height: "20px" }}
                                />
                                {isLoading && (
                                    <LoadingText>로딩 중...</LoadingText>
                                )}
                            </>
                        ) : (
                            <EmptyState>운행 일지 내역이 없습니다</EmptyState>
                        )}
                    </MobileView>
                </>
            )}
        </Container>
    );
};

export default MyRecordsClient;

// Styled Components
const Container = styled.div`
    padding: 1.5rem;
    width: 100%;

    @media (max-width: 1023px) {
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

const Pull = styled(Prev)`
    margin-left: 1rem;

    background-color: #292929;
    color: #fff;
`;

const Header = styled.div`
    margin-bottom: 1.5rem;
`;

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
`;

const TabWrapper = styled.div`
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 1.5rem;
`;

const DesktopView = styled.div`
    display: block;

    @media (max-width: 1023px) {
        display: none;
    }
`;

const MobileView = styled.div`
    display: none;

    @media (max-width: 1023px) {
        display: block;
        margin-bottom: 80px;
    }
`;

const CardGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const ReservationCard = styled.div<{ isFinished?: boolean }>`
    background: white;
    border-radius: 0.75rem;
    padding: 1.25rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    cursor: ${(props) => (props.isFinished ? "not-allowed" : "pointer")};
    opacity: ${(props) => (props.isFinished ? 0.7 : 1)};
    transition: all 0.2s;

    &:hover {
        ${(props) =>
            !props.isFinished &&
            `
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        `}
    }
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
`;

const CardTitle = styled.h3`
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
`;

const BadgeGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
`;

const ReservationStatusBadge = styled.span<{ status?: string }>`
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${(props) => {
        switch (props.status) {
            case "WAITING":
                return "#fef3c7";
            case "DRIVE":
                return "#dbeafe";
            case "FINISH":
                return "#d1fae5";
            default:
                return "#f3f4f6";
        }
    }};
    color: ${(props) => {
        switch (props.status) {
            case "WAITING":
                return "#92400e";
            case "DRIVE":
                return "#1e40af";
            case "FINISH":
                return "#065f46";
            default:
                return "#374151";
        }
    }};
`;

const UsageTypeBadge = styled.span<{ status?: string }>`
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${(props) => {
        switch (props.status) {
            case "BUSINESS":
                return "#e0e7ff";
            case "COMMUTE":
                return "#fce7f3";
            default:
                return "#f3f4f6";
        }
    }};
    color: ${(props) => {
        switch (props.status) {
            case "BUSINESS":
                return "#3730a3";
            case "COMMUTE":
                return "#9f1239";
            default:
                return "#374151";
        }
    }};
`;

const CardContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const CardFooter = styled.div`
    padding: 1rem 1.25rem;
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
`;

const DeleteButton = styled.button`
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

    &:active {
        transform: scale(0.98);
    }
`;

const InfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Label = styled.span`
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
`;

const Value = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
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
            case "WAITING":
                return "#fef3c7";
            case "DRIVE":
                return "#dbeafe";
            case "FINISH":
                return "#d1fae5";
            default:
                return "#f3f4f6";
        }
    }};
    color: ${(props) => {
        switch (props.status) {
            case "WAITING":
                return "#92400e";
            case "DRIVE":
                return "#1e40af";
            case "FINISH":
                return "#065f46";
            default:
                return "#374151";
        }
    }};
`;

const RecordCardWrapper = styled.div`
    background: white;
    border-radius: 0.75rem;
    padding: 1.25rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    &:active {
        transform: translateY(0);
    }
`;

const RecordCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
`;

const RecordCardTitle = styled.h3`
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
`;

const RecordCardDate = styled.span`
    font-size: 0.875rem;
    color: #6b7280;
`;

const RecordCardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const RecordCardRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const RecordCardLabel = styled.span`
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
`;

const RecordCardValue = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 500;
`;

const LoadingText = styled.div`
    text-align: center;
    padding: 1rem;
    color: #6b7280;
    font-size: 0.875rem;
`;

const EmptyState = styled.div`
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

// Bordered Table Components
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

const DateFilterWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);

    @media (max-width: 768px) {
        flex-direction: column;
        gap: 0.75rem;
    }
`;

const DateInputGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;

    @media (max-width: 768px) {
        width: 100%;
    }
`;

const DateLabel = styled.label`
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
`;

const DateInput = styled.input`
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    outline: none;
    transition: all 0.2s;

    &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    @media (max-width: 768px) {
        flex: 1;
    }
`;

const DateSeparator = styled.span`
    font-size: 1rem;
    color: #6b7280;
    font-weight: 500;

    @media (max-width: 768px) {
        display: none;
    }
`;

// 무한 스크롤 관련 스타일
const LoadingTrigger = styled.div`
    height: 20px;
    width: 100%;
`;

const LoadingIndicator = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.75rem;
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const ClickableRow = styled(TRow)`
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: #f3f4f6;
    }
`;
