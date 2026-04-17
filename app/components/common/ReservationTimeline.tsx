"use client";

import styled from "@emotion/styled";
import { useMemo, Fragment, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModalStore } from "@/lib/stores/modalStore";
import axiosInstance from "@/lib/axios";
import useAlertStore from "@/lib/stores/alertStore";
import useUserStore from "@/lib/stores/userStore";

interface Reservation {
    id: number;
    destination: string | null;
    content: string | null;
    usageType: string | null;
    status: string | null;
    startDate: string;
    endDate: string | null;
    employee: {
        employeeNumber: string;
        name: string;
        affiliationName: string;
    } | null;
}

// Vehicle 정보
interface Vehicle {
    id: number;
    name: string | null;
    number: string | null;
    content: string | null;
    vehicleStatus: string | null;
    fuelType: string | null;
    ownerType: string | null;
    registerDate: string | null;
    drivingDate: string | null;
    inspectionDate: string | null;
}

// API 응답 형태
interface VehicleApiResponse {
    vehicle: Vehicle;
    reservations: Reservation[] | null;
}

const ReservationTimeline = ({
    searchKeyword,
    ownerType = "ALL",
}: {
    searchKeyword: string;
    ownerType?: string;
}) => {
    const router = useRouter();
    const { openModal, refreshKey, triggerRefresh } = useModalStore();
    const { setAlert } = useAlertStore();

    // 한국 시간대(KST)로 오늘 날짜 가져오기
    const getKSTDate = () => {
        const kstDateStr = new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        return new Date(kstDateStr);
    };

    // 선택된 날짜 상태
    const [selectedDate, setSelectedDate] = useState(getKSTDate());
    // 뷰 모드 상태 (일별/주간)
    const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
    // 예약 데이터 상태
    const [reservationData, setReservationData] = useState<
        VehicleApiResponse[]
    >([]);
    // 로딩 상태
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUserStore();
    // 시간대 생성 (0시 ~ 23시 30분, 30분 단위)
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = 0; hour <= 23; hour++) {
            slots.push(hour + 0); // 정시
            slots.push(hour + 0.5); // 30분
        }
        return slots;
    }, []);

    // 날짜 포맷팅 (YYYY년 MM월 DD일 (요일))
    const getFormattedDate = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
        const weekday = weekdays[date.getDay()];

        return `${year}년 ${month}월 ${day}일 (${weekday})`;
    };

    // 이전 기간으로 이동 (일별: 1일, 주간: 7일)
    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        const daysToMove = viewMode === "weekly" ? 7 : 1;
        newDate.setDate(newDate.getDate() - daysToMove);
        setSelectedDate(newDate);
    };

    // 다음 기간으로 이동 (일별: 1일, 주간: 7일)
    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        const daysToMove = viewMode === "weekly" ? 7 : 1;
        newDate.setDate(newDate.getDate() + daysToMove);
        setSelectedDate(newDate);
    };

    // 날짜 직접 선택
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        setSelectedDate(newDate);
    };

    // 주간 날짜 계산 (월~토)
    const getWeekDates = (date: Date) => {
        const current = new Date(date);
        const day = current.getDay(); // 0(일) ~ 6(토)
        const diff = day === 0 ? -7 : 1 - day; // 월요일까지의 차이

        const monday = new Date(current);
        monday.setDate(current.getDate() + diff);

        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            // 월~토
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            weekDates.push(date);
        }
        return weekDates;
    };

    console.log(typeof getWeekDates(selectedDate));
    const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

    // 날짜별 예약 데이터 불러오기
    useEffect(() => {
        const fetchReservations = async () => {
            setIsLoading(true);
            try {
                let baseUrl = `/vrs/vehicles`;

                if (viewMode === "weekly") {
                    const weekDates = getWeekDates(selectedDate);
                    const startDateStr = weekDates[0]
                        .toISOString()
                        .split("T")[0];
                    const endDateStr = weekDates[weekDates.length - 1]
                        .toISOString()
                        .split("T")[0];
                    baseUrl += `/week/${startDateStr}/${endDateStr}`;
                } else {
                    // 일별 보기일 때도 전후 7일의 데이터를 가져옴 (여러 날짜에 걸친 예약 포함)
                    const startDate = new Date(selectedDate);
                    startDate.setDate(selectedDate.getDate() - 7);
                    const endDate = new Date(selectedDate);
                    endDate.setDate(selectedDate.getDate() + 7);

                    const startDateStr = startDate.toISOString().split("T")[0];
                    const endDateStr = endDate.toISOString().split("T")[0];
                    baseUrl += `/week/${startDateStr}/${endDateStr}`;
                }
                const response = await axiosInstance.get(baseUrl);
                console.log("API 응답:", response.data);

                setReservationData(response.data);
            } catch (error) {
                console.error("예약 데이터 불러오기 실패:", error);
                setReservationData([]); // 에러 시 빈 배열로 설정
            } finally {
                setIsLoading(false);
            }
        };

        fetchReservations();
    }, [selectedDate, viewMode, refreshKey]);

    // 차량 데이터 (API에서 받은 예약 데이터 + 검색 필터링 + ownerType 필터링)
    const vehiclesWithTodayReservations = useMemo(() => {
        let filtered = reservationData;

        // ownerType 필터링
        if (ownerType !== "ALL") {
            filtered = filtered.filter(
                (data) => data.vehicle.ownerType === ownerType,
            );
        }

        // searchKeyword 필터링
        if (searchKeyword) {
            filtered = filtered.filter((data) => {
                const name = data.vehicle.name?.toLowerCase() || "";
                const number = data.vehicle.number?.toLowerCase() || "";
                const keyword = searchKeyword.toLowerCase();

                return name.includes(keyword) || number.includes(keyword);
            });
        }

        return filtered;
    }, [reservationData, searchKeyword, ownerType]);

    console.log(searchKeyword);

    // 시간대에 예약이 있는지 확인 (30분 단위)
    const getReservationAtTime = (vehicleId: number, timeSlot: number) => {
        const vehicleData = vehiclesWithTodayReservations.find(
            (v) => v.vehicle.id === vehicleId,
        );
        if (!vehicleData || !vehicleData.reservations) return null;

        // 선택된 날짜의 시작과 끝 (00:00 ~ 23:59)
        const selectedDayStart = new Date(selectedDate);
        selectedDayStart.setHours(0, 0, 0, 0);
        const selectedDayEnd = new Date(selectedDate);
        selectedDayEnd.setHours(23, 59, 59, 999);

        for (const reservation of vehicleData.reservations) {
            if (!reservation.endDate) continue;

            const startDateTime = new Date(reservation.startDate);
            const endDateTime = new Date(reservation.endDate);

            // 예약이 선택된 날짜와 겹치는지 확인
            if (
                endDateTime < selectedDayStart ||
                startDateTime > selectedDayEnd
            ) {
                continue; // 이 예약은 선택된 날짜와 겹치지 않음
            }

            // 선택된 날짜 내에서의 시작/종료 시간 계산
            let effectiveStart = startDateTime;
            let effectiveEnd = endDateTime;

            // 예약이 선택된 날짜 이전에 시작했으면, 00:00부터 시작
            if (startDateTime < selectedDayStart) {
                effectiveStart = selectedDayStart;
            }

            // 예약이 선택된 날짜 이후에 끝나면, 23:59까지만
            if (endDateTime > selectedDayEnd) {
                effectiveEnd = selectedDayEnd;
            }

            // 시작 시간을 0.5 단위로 변환 (예: 9시 30분 = 9.5)
            const startHour = effectiveStart.getHours();
            const startMinute = effectiveStart.getMinutes();
            const startTimeSlot = startHour + (startMinute >= 30 ? 0.5 : 0);

            // 종료 시간을 0.5 단위로 변환
            const endHour = effectiveEnd.getHours();
            const endMinute = effectiveEnd.getMinutes();
            const endSecond = effectiveEnd.getSeconds();

            // 23:59:59인 경우 하루의 끝이므로 24.0으로 처리 (다음날 00:00 직전)
            let endTimeSlot;
            if (endHour === 23 && endMinute === 59 && endSecond === 59) {
                endTimeSlot = 24.0;
            } else {
                endTimeSlot = endHour + (endMinute >= 30 ? 0.5 : 0);
            }

            // 해당 시간대가 예약 시간에 포함되는지 확인
            if (timeSlot >= startTimeSlot && timeSlot < endTimeSlot) {
                return reservation;
            }
        }
        return null;
    };

    // 예약 블록의 시작 여부 확인 (30분 단위)
    const isReservationStart = (vehicleId: number, timeSlot: number) => {
        const reservation = getReservationAtTime(vehicleId, timeSlot);
        if (!reservation) return false;

        // 선택된 날짜의 시작 (00:00)
        const selectedDayStart = new Date(selectedDate);
        selectedDayStart.setHours(0, 0, 0, 0);

        const startDateTime = new Date(reservation.startDate);

        // 유효한 시작 시간 계산 (예약이 오늘 이전에 시작했으면 00:00부터)
        let effectiveStart = startDateTime;
        if (startDateTime < selectedDayStart) {
            effectiveStart = selectedDayStart;
        }

        const startHour = effectiveStart.getHours();
        const startMinute = effectiveStart.getMinutes();
        const startTimeSlot = startHour + (startMinute >= 30 ? 0.5 : 0);

        return startTimeSlot === timeSlot;
    };

    // 예약 블록의 길이 계산 (30분 단위)
    const getReservationSpan = (vehicleId: number, timeSlot: number) => {
        const reservation = getReservationAtTime(vehicleId, timeSlot);
        if (!reservation || !reservation.endDate) return 0;

        // 선택된 날짜의 끝 (23:59)
        const selectedDayEnd = new Date(selectedDate);
        selectedDayEnd.setHours(23, 59, 59, 999);

        const endDateTime = new Date(reservation.endDate);

        // 유효한 종료 시간 계산 (예약이 오늘 이후에 끝나면 23:59까지)
        let effectiveEnd = endDateTime;
        if (endDateTime > selectedDayEnd) {
            effectiveEnd = selectedDayEnd;
        }

        const endHour = effectiveEnd.getHours();
        const endMinute = effectiveEnd.getMinutes();
        const endSecond = effectiveEnd.getSeconds();

        // 23:59:59인 경우 하루의 끝이므로 24.0으로 처리
        let endTimeSlot;
        if (endHour === 23 && endMinute === 59 && endSecond === 59) {
            endTimeSlot = 24.0;
        } else {
            endTimeSlot = endHour + (endMinute >= 30 ? 0.5 : 0);
        }

        // 현재 시간부터 끝까지의 길이 (30분 단위 개수)
        return (endTimeSlot - timeSlot) / 0.5;
    };

    return (
        <TimelineContainer>
            <ViewModeToggle>
                <ToggleButton
                    active={viewMode === "daily"}
                    onClick={() => setViewMode("daily")}
                >
                    일별
                </ToggleButton>
                <ToggleButton
                    active={viewMode === "weekly"}
                    onClick={() => setViewMode("weekly")}
                >
                    주간
                </ToggleButton>
            </ViewModeToggle>

            <DateNavigation>
                <NavButton
                    onClick={goToPreviousDay}
                    title={viewMode === "weekly" ? "이전 주" : "전일"}
                >
                    ◀ {viewMode === "weekly" ? "이전 주" : "전일"}
                </NavButton>
                <DateDisplayWrapper>
                    <DateInputWrapper>
                        <DateDisplay>
                            {viewMode === "weekly"
                                ? `${weekDates[0].getMonth() + 1}월 ${weekDates[0].getDate()}일 ~ ${weekDates[5].getMonth() + 1}월 ${weekDates[5].getDate()}일`
                                : getFormattedDate(selectedDate)}
                        </DateDisplay>
                        <DateInput
                            type="date"
                            value={selectedDate.toISOString().split("T")[0]}
                            onChange={handleDateChange}
                        />
                    </DateInputWrapper>
                </DateDisplayWrapper>
                <NavButton
                    onClick={goToNextDay}
                    title={viewMode === "weekly" ? "다음 주" : "다음일"}
                >
                    {viewMode === "weekly" ? "다음 주" : "다음일"} ▶
                </NavButton>
            </DateNavigation>

            {isLoading ? (
                <LoadingContainer>
                    <LoadingSpinner />
                    <LoadingText>로딩 중...</LoadingText>
                </LoadingContainer>
            ) : viewMode === "daily" ? (
                <div style={{ width: "100%", overflowX: "auto" }}>
                    <TimelineGrid>
                        <HeaderCell />
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                            <MergedTimeCell key={hour}>{hour}시</MergedTimeCell>
                        ))}

                        {vehiclesWithTodayReservations.length === 0 && (
                            <div
                                style={{
                                    gridColumn: "1 / -1",
                                    textAlign: "center",
                                    padding: "1rem",
                                }}
                            >
                                조회된 차량이 없습니다.
                            </div>
                        )}
                        {vehiclesWithTodayReservations.map(
                            (vehicleData, index) => (
                                <Fragment
                                    key={`vehicle-${vehicleData.vehicle.id}`}
                                >
                                    <VehicleCell
                                        style={{ gridRow: index + 2 }}
                                        onClick={() =>
                                            router.push(
                                                `/vehicles/${vehicleData.vehicle.id}`,
                                            )
                                        }
                                    >
                                        <VehicleNumber>
                                            {vehicleData.vehicle.number}
                                        </VehicleNumber>
                                        <VehicleName>
                                            {vehicleData.vehicle.name}
                                        </VehicleName>
                                    </VehicleCell>
                                    {timeSlots.map((timeSlot) => {
                                        const reservation =
                                            getReservationAtTime(
                                                vehicleData.vehicle.id,
                                                timeSlot,
                                            );
                                        const isStart = isReservationStart(
                                            vehicleData.vehicle.id,
                                            timeSlot,
                                        );
                                        const span = getReservationSpan(
                                            vehicleData.vehicle.id,
                                            timeSlot,
                                        );

                                        // 예약이 있고 시작 지점인 경우 - 예약 블록 렌더링
                                        if (reservation && isStart) {
                                            const isHourStart =
                                                timeSlot % 1 === 0;
                                            return (
                                                <ReservationBlock
                                                    key={`${vehicleData.vehicle.id}-${timeSlot}`}
                                                    span={span}
                                                    usageType={
                                                        reservation.usageType ||
                                                        "ETC"
                                                    }
                                                    status={
                                                        reservation.status ||
                                                        "WAITING"
                                                    }
                                                    isHourStart={isHourStart}
                                                    title={`${reservation.employee?.name || "미정"} - ${reservation.destination || ""}`}
                                                    style={{
                                                        gridRow: index + 2,
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // FINISH 상태면 수정 불가
                                                        if (
                                                            reservation.status ===
                                                                "FINISH" ||
                                                            reservation
                                                                ?.employee
                                                                ?.employeeNumber !==
                                                                user?.employeeNumber
                                                        ) {
                                                            return;
                                                        }
                                                        openModal(
                                                            "EDIT_RESERVATION",
                                                            vehicleData.vehicle.id.toString(),
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
                                                                emplopyeeNumber:
                                                                    reservation
                                                                        .employee
                                                                        ?.employeeNumber ||
                                                                    "",
                                                                status:
                                                                    reservation?.status ||
                                                                    "",
                                                            },
                                                        );
                                                    }}
                                                >
                                                    <ReservationInfo>
                                                        <ReservationUser>
                                                            {reservation
                                                                .employee
                                                                ?.name ||
                                                                "미정"}
                                                        </ReservationUser>
                                                        <ReservationDest>
                                                            {reservation.destination ||
                                                                "-"}
                                                        </ReservationDest>
                                                    </ReservationInfo>
                                                    {reservation.status !==
                                                        "FINISH" &&
                                                        reservation.employee
                                                            ?.employeeNumber ===
                                                            user?.employeeNumber && (
                                                            <DeleteIcon
                                                                onClick={(
                                                                    e,
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
                                                                                triggerRefresh();
                                                                            } catch (error) {
                                                                                console.error(
                                                                                    "예약 취소 실패:",
                                                                                    error,
                                                                                );
                                                                                setAlert(
                                                                                    "error",
                                                                                    "예약 취소에 실패했습니다.",
                                                                                );
                                                                            }
                                                                        },
                                                                    );
                                                                }}
                                                            >
                                                                ✕
                                                            </DeleteIcon>
                                                        )}
                                                </ReservationBlock>
                                            );
                                        }

                                        // 예약 중간 슬롯은 아무것도 렌더링하지 않음
                                        // (ReservationBlock의 grid-column: span N 이 해당 공간을 차지)
                                        if (reservation && !isStart) {
                                            return null;
                                        }

                                        const hour = Math.floor(timeSlot);
                                        const isHalfSlot = timeSlot % 1 !== 0;
                                        const dateStr = selectedDate
                                            .toISOString()
                                            .split("T")[0];

                                        // 빈 슬롯 - 정시(00분) 슬롯
                                        if (!isHalfSlot) {
                                            return (
                                                <EmptyCell
                                                    key={`${vehicleData.vehicle.id}-${timeSlot}`}
                                                    style={{
                                                        gridRow: index + 2,
                                                    }}
                                                    isHourStart={true}
                                                    onClick={() => {
                                                        const startDate = `${dateStr}T${hour
                                                            .toString()
                                                            .padStart(
                                                                2,
                                                                "0",
                                                            )}:00:00`;
                                                        const endDate = `${dateStr}T${hour
                                                            .toString()
                                                            .padStart(
                                                                2,
                                                                "0",
                                                            )}:30:00`;
                                                        openModal(
                                                            "NEW_RESERVATION",
                                                            vehicleData.vehicle.id.toString(),
                                                            undefined,
                                                            startDate,
                                                            endDate,
                                                        );
                                                    }}
                                                />
                                            );
                                        }

                                        // 빈 슬롯 - 30분 슬롯
                                        return (
                                            <EmptyCell
                                                key={`${vehicleData.vehicle.id}-${timeSlot}-half`}
                                                style={{ gridRow: index + 2 }}
                                                isHourStart={false}
                                                onClick={() => {
                                                    const startDate = `${dateStr}T${hour
                                                        .toString()
                                                        .padStart(
                                                            2,
                                                            "0",
                                                        )}:30:00`;
                                                    // 23:30 슬롯이면 종료는 다음 날 00:00
                                                    let endDate: string;
                                                    if (hour === 23) {
                                                        const nextDay =
                                                            new Date(
                                                                selectedDate,
                                                            );
                                                        nextDay.setDate(
                                                            nextDay.getDate() +
                                                                1,
                                                        );
                                                        const nextDateStr =
                                                            nextDay
                                                                .toISOString()
                                                                .split("T")[0];
                                                        endDate = `${nextDateStr}T00:00:00`;
                                                    } else {
                                                        endDate = `${dateStr}T${(
                                                            hour + 1
                                                        )
                                                            .toString()
                                                            .padStart(
                                                                2,
                                                                "0",
                                                            )}:00:00`;
                                                    }
                                                    openModal(
                                                        "NEW_RESERVATION",
                                                        vehicleData.vehicle.id.toString(),
                                                        undefined,
                                                        startDate,
                                                        endDate,
                                                    );
                                                }}
                                            />
                                        );
                                    })}
                                </Fragment>
                            ),
                        )}
                    </TimelineGrid>
                </div>
            ) : (
                <WeeklyGrid>
                    {/* 헤더: 빈 셀 + 요일 */}
                    <HeaderCell />
                    {weekDates.map((date, index) => (
                        <WeekDayCell key={index}>
                            <WeekDayName>
                                {
                                    ["월", "화", "수", "목", "금", "토", "일"][
                                        index
                                    ]
                                }
                            </WeekDayName>
                            <WeekDate>
                                {date.getMonth() + 1}/{date.getDate()}
                            </WeekDate>
                        </WeekDayCell>
                    ))}

                    {/* 각 차량별 주간 예약 */}
                    {reservationData.map((vehicleData) => (
                        <Fragment key={`vehicle-${vehicleData.vehicle.id}`}>
                            <VehicleCell
                                onClick={() =>
                                    router.push(
                                        `/vehicles/${vehicleData.vehicle.id}`,
                                    )
                                }
                            >
                                <VehicleNumber>
                                    {vehicleData.vehicle.number}
                                </VehicleNumber>
                                <VehicleName>
                                    {vehicleData.vehicle.name}
                                </VehicleName>
                            </VehicleCell>
                            {weekDates.map((date, index) => {
                                const dateStr = date
                                    .toISOString()
                                    .split("T")[0];
                                const dayReservations = (
                                    vehicleData.reservations || []
                                ).filter((reservation: Reservation) => {
                                    if (!reservation.endDate) return false;
                                    // "2026-02-23 11:00" 또는 "2026-02-23T11:00:00" 형식 모두 지원
                                    const startDateStr =
                                        reservation.startDate.split(/[ T]/)[0];
                                    const endDateStr =
                                        reservation.endDate.split(/[ T]/)[0];
                                    // 해당 날짜가 예약 기간 내에 포함되는지 확인
                                    return (
                                        dateStr >= startDateStr &&
                                        dateStr <= endDateStr
                                    );
                                });

                                return (
                                    <WeekDayReservationCell
                                        key={`${vehicleData.vehicle.id}-${index}`}
                                        onClick={() => {
                                            const startDate = `${dateStr}T09:00:00`;
                                            const endDate = `${dateStr}T18:00:00`;
                                            openModal(
                                                "NEW_RESERVATION",
                                                vehicleData.vehicle.id.toString(),
                                                undefined,
                                                startDate,
                                                endDate,
                                            );
                                        }}
                                    >
                                        {dayReservations.map((reservation) => {
                                            // "2026-01-20 11:00" 또는 "2026-01-20T11:00:00" 형식에서 날짜와 시간 분리
                                            const startDateStr =
                                                reservation.startDate.split(
                                                    /[ T]/,
                                                )[0];
                                            const endDateStr =
                                                reservation.endDate?.split(
                                                    /[ T]/,
                                                )[0];
                                            const startTimePart =
                                                reservation.startDate.split(
                                                    /[ T]/,
                                                )[1];
                                            const endTimePart =
                                                reservation.endDate?.split(
                                                    /[ T]/,
                                                )[1];

                                            // 현재 날짜가 시작일인지, 종료일인지 확인
                                            const isStartDate =
                                                dateStr === startDateStr;
                                            const isEndDate =
                                                dateStr === endDateStr;
                                            const isMiddleDate =
                                                !isStartDate && !isEndDate;

                                            // 표시할 시간 결정
                                            let displayTime = "";
                                            if (isStartDate && isEndDate) {
                                                // 당일 예약 (시작일 = 종료일)
                                                const startHour =
                                                    startTimePart?.split(
                                                        ":",
                                                    )[0] || "00";
                                                const endHour =
                                                    endTimePart?.split(
                                                        ":",
                                                    )[0] || "00";
                                                displayTime = `${startHour}시 ~ ${endHour}시`;
                                            } else if (isStartDate) {
                                                // 시작일 (다음날 이후까지 계속)
                                                const startHour =
                                                    startTimePart?.split(
                                                        ":",
                                                    )[0] || "00";
                                                displayTime = `${startHour}시 ~ 익일`;
                                            } else if (isEndDate) {
                                                // 종료일 (이전날부터 시작)
                                                const endHour =
                                                    endTimePart?.split(
                                                        ":",
                                                    )[0] || "00";
                                                displayTime = `전일 ~ ${endHour}시`;
                                            } else if (isMiddleDate) {
                                                // 중간일 (전일부터 익일까지)
                                                displayTime = "종일";
                                            }

                                            return (
                                                <ReservationBadge
                                                    key={reservation.id}
                                                    usageType={
                                                        reservation.usageType ||
                                                        "ETC"
                                                    }
                                                    status={
                                                        reservation.status ||
                                                        "WAITING"
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // FINISH 상태면 수정 불가
                                                        if (
                                                            reservation.status ===
                                                                "FINISH" ||
                                                            reservation
                                                                ?.employee
                                                                ?.employeeNumber !==
                                                                user?.employeeNumber
                                                        ) {
                                                            return;
                                                        }
                                                        openModal(
                                                            "EDIT_RESERVATION",
                                                            vehicleData.vehicle.id.toString(),
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
                                                    }}
                                                >
                                                    <div>
                                                        {reservation.employee
                                                            ?.name || "미정"}
                                                    </div>
                                                    <div>{displayTime}</div>
                                                </ReservationBadge>
                                            );
                                        })}
                                    </WeekDayReservationCell>
                                );
                            })}
                        </Fragment>
                    ))}
                </WeeklyGrid>
            )}
        </TimelineContainer>
    );
};

export default ReservationTimeline;

const TimelineContainer = styled.div`
    width: 100%;

    background-color: white;
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const ViewModeToggle = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    justify-content: center;
`;

const ToggleButton = styled.button<{ active: boolean }>`
    padding: 0.5rem 1.5rem;
    border: 1px solid ${(props) => (props.active ? "#2563eb" : "#d1d5db")};
    border-radius: 0.375rem;
    background-color: ${(props) => (props.active ? "#2563eb" : "white")};
    color: ${(props) => (props.active ? "white" : "#374151")};
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: ${(props) => (props.active ? "#1d4ed8" : "#f3f4f6")};
        border-color: ${(props) => (props.active ? "#1d4ed8" : "#9ca3af")};
    }
`;

const DateNavigation = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
`;

const NavButton = styled.button`
    padding: 0.5rem 0.75rem;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    color: #374151;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: #f3f4f6;
        border-color: #9ca3af;
    }

    &:active {
        transform: scale(0.95);
    }
`;

const DateDisplayWrapper = styled.div`
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const DateInputWrapper = styled.div`
    position: relative;
    display: inline-block;
`;

const DateDisplay = styled.div`
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    text-align: center;
    padding: 0.5rem 1rem;
    cursor: pointer;
    pointer-events: none;

    @media (max-width: 768px) {
        font-size: 1rem;
    }
`;

const DateInput = styled.input`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;

    &::-webkit-calendar-picker-indicator {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
        cursor: pointer;
    }
`;

const TimelineGrid = styled.div`
    width: 100%;
    display: grid;

    grid-template-columns: 150px repeat(48, minmax(40px, 1fr)); /* 차량명 + 48개 슬롯 (30분 단위) */
    grid-auto-rows: 60px; /* 모든 행을 60px 고정 높이로 설정 */
    border: 1px solid #e5e7eb;
    min-width: fit-content;
`;

const HeaderCell = styled.div`
    background-color: #f3f4f6;
    padding: 0.75rem;
    font-weight: 600;
    text-align: center;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    left: 0;
    z-index: 30;
`;

const MergedTimeCell = styled.div`
    grid-column: span 2; /* 2칸 합침 */
    background-color: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    text-align: center;
    font-size: 0.875rem;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 20;
`;

const VehicleCell = styled.div`
    background-color: #f9fafb;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 60px;
    height: 100%; /* 행 높이에 맞춤 */
    overflow: hidden;
    position: sticky;
    left: 0;
    z-index: 10;

    &:hover {
        background-color: #f3f4f6;

        div:first-of-type {
            color: #2563eb;
        }
    }

    @media (max-width: 768px) {
        padding: 1rem;
        min-height: 60px;
        justify-content: center;
    }
`;

const VehicleNumber = styled.div`
    font-weight: 600;
    font-size: 0.875rem;
    color: #1f2937;
    transition: color 0.2s;
`;

const VehicleName = styled.div`
    font-size: 0.75rem;
    color: #6b7280;
`;

const EmptyCell = styled.div<{ isHourStart?: boolean }>`
    background-color: white;
    height: 60px;
    max-height: 60px;
    border-bottom: 1px solid #e5e7eb;
    border-left: ${(props) =>
        props.isHourStart ? "1px solid #e5e7eb" : "none"};
    cursor: pointer;
    transition: background-color 0.2s;
    overflow: hidden;

    &:hover {
        background-color: #f0f9ff;
    }
`;

// Status별 색상 정의
const getStatusColor = (status: string) => {
    switch (status) {
        case "DRIVE":
            return { bg: "#dbeafe", border: "#3b82f6" };
        case "FINISH": // 운행 중 - 초록색
            return { bg: "#d1fae5", border: "#10b981" };
        case "GARAGE": // 반납 완료 - 회색
            return { bg: "#f3f4f6", border: "#9ca3af" };
        case "CANCEL": // 취소 - 빨간색
            return { bg: "#fee2e2", border: "#ef4444" };
        default:
            return { bg: "#fef3c7", border: "#f59e0b" };
    }
};

const ReservationBlock = styled.div<{
    span: number;
    usageType: string;
    status: string;
    isHourStart?: boolean;
}>`
    grid-column: span ${(props) => props.span};
    background-color: ${(props) => getStatusColor(props.status).bg};
    border: 2px solid ${(props) => getStatusColor(props.status).border};
    border-radius: 0.375rem;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: ${(props) =>
        props.status === "FINISH" ? "not-allowed" : "pointer"};
    opacity: ${(props) => (props.status === "FINISH" ? "0.7" : "1")};
    transition: all 0.15s;
    height: 60px;
    max-height: 60px;
    overflow: hidden;

    &:hover {
        box-shadow: ${(props) =>
            props.status === "FINISH"
                ? "none"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"};
        transform: ${(props) =>
            props.status === "FINISH" ? "none" : "translateY(-1px)"};
    }
`;

const ReservationInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
`;

const ReservationUser = styled.div`
    font-weight: 600;
    font-size: 0.875rem;
    color: #1f2937;
`;

const ReservationDest = styled.div`
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const DeleteIcon = styled.button`
    position: absolute;
    top: 0.125rem;
    right: 0.125rem;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: rgba(220, 38, 38, 0.9);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1;
    transition: all 0.15s;
    opacity: 0.8;
    z-index: 10;
    padding: 0;

    &:hover {
        opacity: 1;
        background-color: rgba(185, 28, 28, 1);
        transform: scale(1.15);
    }

    &:active {
        transform: scale(0.9);
    }
`;

// 주간 뷰 스타일
const WeeklyGrid = styled.div`
    display: grid;
    grid-template-columns: 150px repeat(7, 1fr); /* 차량명 + 7일 (월~일) */
    border: 1px solid #e5e7eb;
    min-width: fit-content;
    align-items: stretch; /* 모든 셀을 행 높이에 맞춤 */
`;

const WeekDayCell = styled.div`
    background-color: #f3f4f6;
    padding: 0.75rem;
    text-align: center;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    height: 60px;
`;

const WeekDayName = styled.div`
    font-weight: 600;
    font-size: 0.875rem;
    color: #1f2937;
`;

const WeekDate = styled.div`
    font-size: 0.75rem;
    color: #6b7280;
`;

const WeekDayReservationCell = styled.div`
    background-color: white;
    min-height: 60px; /* VehicleCell과 동일한 최소 높이 */
    height: 100%; /* 행 높이에 맞춤 */
    padding: 0.5rem;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow-y: auto; /* 예약이 많으면 스크롤 */

    &:hover {
        background-color: #f0f9ff;
    }
`;

const ReservationBadge = styled.div<{ usageType: string; status: string }>`
    padding: 0.375rem 0.5rem;
    background-color: ${(props) => getStatusColor(props.status).bg};
    border-left: 3px solid ${(props) => getStatusColor(props.status).border};
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: ${(props) =>
        props.status === "FINISH" ? "not-allowed" : "pointer"};
    opacity: ${(props) => (props.status === "FINISH" ? "0.7" : "1")};

    &:hover {
        background-color: ${(props) =>
            props.status === "FINISH"
                ? getStatusColor(props.status).bg
                : `${getStatusColor(props.status).bg}dd`};
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
`;

const LoadingSpinner = styled.div`
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

const LoadingText = styled.div`
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
`;
