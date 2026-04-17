"use client";

import { useModalStore } from "@/lib/stores/modalStore";
import styled from "@emotion/styled";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";
import {
    ModalContentContainer,
    ModalHeader,
    ModalContent,
    Xbutton,
    ModalLabel,
    ModalFooter,
    FullWidthContainer,
    Button,
    InputGroup,
    StyledInput,
    StyledSelect,
    StyledTextarea,
} from "./styles/modalStyling";
import axios, { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";
import { useCarStore } from "@/lib/stores/carStore";
import useUserStore from "@/lib/stores/userStore";
import useAlertStore from "@/lib/stores/alertStore";

interface RecentReservation {
    id: number;
    startDate: string;
    destination: string;
    vehicle: {
        id: number;
        number: string;
    };
}

interface NewRecordProps {
    isPage?: boolean;
}

const NewRecord = ({ isPage = false }: NewRecordProps) => {
    const path = usePathname();
    const router = useRouter();
    const { setAlert } = useAlertStore();
    const { closeModal, modal, triggerRefresh } = useModalStore();
    const { cars, fetchCars } = useCarStore();
    const { user } = useUserStore();

    // 초기 차량의 distance 가져오기
    const initialVehicleId = Number(modal?.vehicleId) || 0;
    const initialCar = cars.find((car) => car.id === initialVehicleId);
    const initialDistance = initialCar?.distance || 0;

    // 예약 데이터에서 초기값 가져오기
    const reservationData = modal?.reservationData;
    const initialContent = reservationData?.content || "";

    // 한국 시간(KST) 기준 오늘 날짜
    const kstDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    // startDate와 endDate에서 useDate 추출 (YYYY-MM-DD 형식), 없으면 오늘 날짜
    const initialUseDate = modal?.startDate
        ? modal.startDate.split("T")[0]
        : kstDate;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [recordState, setRecordState] = useState({
        id: 0,
        isInspection: false,
        totalDistance: 0,
        beforeDistance: initialDistance,
        currentDistance: "" as number | "",
        commuteDistance: 0,
        businessDistance: 0,
        content: initialContent,
        useDate: initialUseDate,
        vehicle: {
            id: initialVehicleId,
        },
        employee: {
            id: user?.id || 0,
        },
    });

    // 최신 예약 데이터 가져오기 (reservationData가 없을 때만)
    const [recentReservations, setRecentReservations] = useState<
        RecentReservation[]
    >([]);

    useEffect(() => {
        const fetchRecentReservations = async () => {
            if (!reservationData && user?.employeeNumber) {
                try {
                    const response = await axiosInstance.get(
                        `/vrs/vehicle-reservations/my`,
                        {
                            params: {
                                page: 0,
                                size: 5,
                            },
                        },
                    );
                    setRecentReservations(response.data.content || []);
                } catch (error) {
                    setAlert(
                        "error",
                        "최근 예약 내역을 불러오는데 실패했습니다.",
                    );
                }
            }
        };

        fetchRecentReservations();
    }, [reservationData, user?.employeeNumber]);

    // 예약 배지 클릭 핸들러
    const handleReservationClick = (reservation: RecentReservation) => {
        const useDate = reservation.startDate
            ? reservation.startDate.split("T")[0]
            : "";
        const vehicleId = reservation.vehicle?.id || 0;
        const selectedCar = cars.find((car) => car.id === vehicleId);
        const currentDistance = selectedCar?.distance || 0;

        setRecordState((prev) => ({
            ...prev,
            content: reservation.destination || "",
            useDate: useDate,
            vehicle: {
                id: vehicleId,
            },
            beforeDistance: currentDistance,
        }));
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean = value;

        if (type === "checkbox") {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === "number") {
            finalValue = value === "" ? 0 : Number(value);
        }

        // 차량 선택 시 vehicle.id로 업데이트
        if (name === "vehicleId") {
            const vehicleId = Number(value);
            const selectedCar = cars.find((car) => car.id === vehicleId);
            setRecordState((prev) => ({
                ...prev,
                vehicle: { id: vehicleId },
                beforeDistance: selectedCar?.distance || 0,
            }));
            return;
        }

        setRecordState((prev) => {
            const newState = { ...prev, [name]: finalValue };

            // 1. 계기판(Before/Current) 수정 시 -> Total을 구하고 모두 Business에 할당
            if (name === "beforeDistance" || name === "currentDistance") {
                const before = Number(newState.beforeDistance) || 0;
                const after = Number(newState.currentDistance) || 0;
                const calculatedTotal = Math.max(0, after - before);

                newState.totalDistance = calculatedTotal;
                newState.businessDistance = calculatedTotal; // 일단 전부 업무용으로
                newState.commuteDistance = 0; // 출퇴근은 0으로 초기화
            }

            // 2. 업무용(business) 수정 시 -> (Total - 업무용) 만큼 출퇴근(commute) 자동 계산
            else if (name === "businessDistance") {
                const total = Number(prev.totalDistance) || 0;
                const biz = Number(finalValue) || 0;

                // 입력값이 total을 넘지 않도록 제한하거나, 그대로 두고 차액을 계산
                newState.commuteDistance = Math.max(0, total - biz);
            }

            // 3. 출퇴근(commute) 수정 시 -> (Total - 출퇴근) 만큼 업무용(business) 자동 계산
            else if (name === "commuteDistance") {
                const total = Number(prev.totalDistance) || 0;
                const com = Number(finalValue) || 0;

                newState.businessDistance = Math.max(0, total - com);
            }

            return newState;
        });
    };

    // TODO: 운행 내역 추가 로직
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        // currentDistance 검증
        if (!recordState.currentDistance || Number(recordState.currentDistance) <= 0) {
            setAlert("error", "현재 주행거리는 0보다 커야 합니다.");
            return;
        }

        if (
            recordState.totalDistance !==
            recordState.businessDistance + recordState.commuteDistance
        ) {
            setAlert("error", "총 주행거리와 운행 내역이 일치하지 않습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            const apiUrl = "/vrs/vehicle-records/create";

            // currentDistance를 number로 변환
            const submitData = {
                ...recordState,
                currentDistance: Number(recordState.currentDistance),
            };

            const response = await axiosInstance.post(apiUrl, submitData);
            setAlert("success", "등록 되었습니다.");

            // 클라이언트 상태 갱신
            await fetchCars();
            triggerRefresh();

            closeModal();

            // Server Component 데이터 갱신 (refresh 대신 현재 페이지로 replace)
            setTimeout(() => {
                router.replace(
                    window.location.pathname + window.location.search,
                );
            }, 100);
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            setAlert(
                "error",
                axiosError.response?.data?.detail || "등록에 실패했습니다.",
            );
            // 모달은 닫지 않고 에러 표시
        } finally {
            setIsSubmitting(false);
        }
    };

    // new-records 페이지일 때 navbar 높이만큼 margin-bottom 추가
    const isNewRecordsPage = path === "/new-records";

    return (
        <ModalContentContainer
            onSubmit={handleSubmit}
            style={{
                backgroundColor: "#fff",
                overflow: "auto",
                marginBottom: isNewRecordsPage ? "80px" : "0",
                borderRadius: isNewRecordsPage ? "0.75rem" : "0",
            }}
        >
            <ModalHeader>
                <Title>운행 내역 등록</Title>
                {path === "/new-records" ? null : (
                    <CloseButton onClick={closeModal}>&times;</CloseButton>
                )}
            </ModalHeader>
            <ModalBody isNewRecordsPage={path === "/new-records"}>
                <FormGrid>
                    {path === "/new-records" ||
                    modal?.vehicleId === undefined ? (
                        <FormGroupFull>
                            <Label>차량 선택</Label>
                            <Select
                                name="vehicleId"
                                value={recordState.vehicle.id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">차량을 선택하세요</option>
                                {cars && cars.length > 0
                                    ? cars.map((car) => (
                                          <option key={car.id} value={car.id}>
                                              {car.number} ({car.name})
                                          </option>
                                      ))
                                    : null}
                            </Select>
                        </FormGroupFull>
                    ) : null}

                    {/* 최근 예약 배지 (reservationData가 없을 때만 표시) */}
                    {!reservationData && recentReservations.length > 0 && (
                        <FormGroupFull>
                            <Label>최근 예약 내역</Label>
                            <ReservationBadgeContainer>
                                {recentReservations.map((reservation) => {
                                    const startDate = reservation.startDate
                                        ? new Date(reservation.startDate)
                                        : null;
                                    const dateStr = startDate
                                        ? `${startDate.getMonth() + 1}/${startDate.getDate()}`
                                        : "";
                                    const timeStr = startDate
                                        ? `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`
                                        : "";
                                    const destination =
                                        reservation.destination ||
                                        "목적지 없음";

                                    return (
                                        <ReservationBadge
                                            key={reservation.id}
                                            type="button"
                                            onClick={() =>
                                                handleReservationClick(
                                                    reservation,
                                                )
                                            }
                                        >
                                            <BadgeDate>{dateStr}</BadgeDate>
                                            <BadgeTime>{timeStr}</BadgeTime>
                                            <BadgeDestination>
                                                {destination}
                                            </BadgeDestination>
                                        </ReservationBadge>
                                    );
                                })}
                            </ReservationBadgeContainer>
                        </FormGroupFull>
                    )}

                    <FormGroup>
                        <Label>사용일자</Label>
                        <Input
                            type="date"
                            name="useDate"
                            value={recordState.useDate}
                            onChange={handleChange}
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>주행 전(km)</Label>
                        <Input
                            type="number"
                            name="beforeDistance"
                            value={recordState.beforeDistance}
                            onChange={handleChange}
                            placeholder="0"
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>주행 후(km)</Label>
                        <Input
                            type="number"
                            name="currentDistance"
                            value={recordState.currentDistance}
                            onChange={handleChange}
                            placeholder="0"
                            min="1"
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>총 주행거리(km)</Label>
                        <Input
                            type="number"
                            name="totalDistance"
                            value={recordState.totalDistance}
                            onChange={handleChange}
                            placeholder="자동 계산됨"
                            readOnly
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>출/퇴근용(km)</Label>
                        <Input
                            type="number"
                            name="commuteDistance"
                            value={recordState.commuteDistance}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>일반 업무용(km)</Label>
                        <Input
                            type="number"
                            name="businessDistance"
                            value={recordState.businessDistance}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormGroup>
                    <FormGroupFull>
                        <Label>비고</Label>
                        <TextArea
                            name="content"
                            value={recordState.content}
                            onChange={handleChange}
                            placeholder="비고 사항을 입력하세요"
                            rows={3}
                        />
                    </FormGroupFull>
                </FormGrid>
            </ModalBody>
            <ModalFooter>
                {!isPage && (
                    <CancelButton
                        type="button"
                        onClick={closeModal}
                        disabled={isSubmitting}
                    >
                        취소
                    </CancelButton>
                )}
                <SubmitButton
                    type="submit"
                    disabled={isSubmitting}
                    $isPage={isPage}
                >
                    {isSubmitting ? "등록 중..." : "등록"}
                </SubmitButton>
            </ModalFooter>
        </ModalContentContainer>
    );
};

export default NewRecord;

const Title = styled.h2`
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: 2rem;
    color: #9ca3af;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        color: #374151;
    }
`;

const ModalBody = styled.div<{ isNewRecordsPage?: boolean }>`
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
    ${(props) =>
        props.isNewRecordsPage
            ? `
    max-height: calc(100% - 80px);;
    `
            : `
        max-height: calc(80vh - 150px);

        @media (max-width: 768px) {
            max-height: calc(100vh - 180px);
        }
    `}
`;

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const FormGroupFull = styled(FormGroup)`
    grid-column: 1 / -1;
`;

const Label = styled.label`
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
`;

const Select = styled.select`
    width: 100%;
    padding: 0.625rem 2rem 0.625rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.625rem center;
    background-size: 12px;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: #0064fe;
    }
`;

const Input = styled.input`
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:read-only {
        background-color: #f9fafb;
        cursor: not-allowed;
    }

    &::placeholder {
        color: #9ca3af;
    }
`;

const TextArea = styled.textarea`
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.15s ease;
    resize: none;
    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: #9ca3af;
    }
`;

const CancelButton = styled.button`
    padding: 0.625rem 1.25rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #f9fafb;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SubmitButton = styled.button<{ $isPage?: boolean }>`
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.375rem;
    background: #3b82f6;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #2563eb;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background-color: #93c5fd;
    }

    ${(props) =>
        props.$isPage &&
        `
        margin-bottom: 2rem;

    `}
`;

const ReservationBadgeContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
`;

const ReservationBadge = styled.button`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.75rem;

    &:hover {
        background: #e5e7eb;
        border-color: #d1d5db;
    }

    &:active {
        transform: scale(0.98);
    }
`;

const BadgeDate = styled.span`
    font-weight: 600;
    color: #374151;
`;

const BadgeTime = styled.span`
    color: #6b7280;
`;

const BadgeDestination = styled.span`
    color: #3b82f6;
    font-weight: 500;
`;
