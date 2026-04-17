"use client";
import styled from "@emotion/styled";
import {
    ModalContentContainer,
    ModalHeader,
    Xbutton,
    ModalLabel,
    ModalFooter,
    Button,
    InputGroup,
    StyledInput,
    StyledTextarea,
} from "./styles/modalStyling";
import { useModalStore } from "@/lib/stores/modalStore";
import { FormEvent, useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import { Car, useCarStore } from "@/lib/stores/carStore";
import { useRouter } from "next/navigation";
import useAlertStore from "@/lib/stores/alertStore";
import { AxiosError } from "axios";

interface ReservationData {
    id: number;
    destination: string;
    content: string;
    startDate: string;
    endDate: string;
    vehicle: {
        id: number;
    };
    status: string;
}

interface ValidationCar {
    isAvailable: boolean;
    vehicle: Car;
}

// "YYYY-MM-DDTHH:mm" 형식을 날짜/시간으로 분리
const splitDateTime = (datetime: string) => {
    const [date, time] = datetime.split("T");
    return { date: date || "", time: time?.slice(0, 5) || "09:00" };
};

// 날짜 + 시간 문자열을 합쳐 "YYYY-MM-DDTHH:mm" 형식으로 반환
const joinDateTime = (date: string, time: string) => `${date}T${time}`;

// 30분 단위 시간 옵션 생성 (00:00 ~ 23:30)
const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const label = `${String(hour).padStart(2, "0")}:${minute}`;
    return { value: label, label };
});

const Reservation = () => {
    const { closeModal, modal, triggerRefresh } = useModalStore();
    const { cars, fetchCars } = useCarStore();
    const { setAlert } = useAlertStore();
    const router = useRouter();

    const [validates, setValidates] = useState<ValidationCar[] | []>([]);
    const [isLoadingValidation, setIsLoadingValidation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 한국 시간(KST) 기준으로 오늘 날짜 가져오기
    const today = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    // modal에서 전달된 startDate/endDate가 있으면 사용, 없으면 기본값
    const initialStartDate = modal?.startDate
        ? modal.startDate.slice(0, 16)
        : `${today}T09:00`;
    const initialEndDate = modal?.endDate
        ? modal.endDate.slice(0, 16)
        : `${today}T18:00`;

    // 수정 모드인지 확인 (reservationId가 있으면 수정 모드)
    const isEditMode = !!modal?.reservationData?.reservationId;

    const [reservation, setReservation] = useState<ReservationData>({
        id: modal?.reservationData?.reservationId || 0,
        destination: modal?.reservationData?.destination || "",
        content: modal?.reservationData?.content || "",
        startDate: initialStartDate,
        endDate: initialEndDate,
        status: "",
        vehicle: {
            id: Number(modal?.vehicleId) || 0,
        },
    });

    const startParts = splitDateTime(reservation.startDate);
    const endParts = splitDateTime(reservation.endDate);

    // 날짜 또는 시간 변경 핸들러
    const handleDateTimeChange = (
        field: "startDate" | "endDate",
        part: "date" | "time",
        value: string,
    ) => {
        const current = splitDateTime(reservation[field]);
        const updated =
            part === "date"
                ? joinDateTime(value, current.time)
                : joinDateTime(current.date, value);
        setReservation((prev) => ({ ...prev, [field]: updated }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (isEditMode) {
                // 수정 모드 - status 포함
                const submitData = {
                    ...reservation,
                };
                await axiosInstance.patch(
                    "/vrs/vehicle-reservations/update",
                    submitData,
                );
                setAlert("success", "예약이 수정 되었습니다.");
            } else {
                // 생성 모드 - status 제외
                const { status, ...submitData } = reservation;
                await axiosInstance.post(
                    "/vrs/vehicle-reservations/create",
                    submitData,
                );
                setAlert("success", "예약이 등록 되었습니다.");
            }

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
                axiosError.response?.data?.detail ||
                    "예약 처리에 실패했습니다.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;

        if (name === "vehicleId") {
            setReservation((prev) => ({
                ...prev,
                vehicle: { id: Number(value) },
            }));
            return;
        }

        setReservation((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDelete = () => {
        if (!isEditMode || !reservation.id) return;

        setAlert("confirm", "예약을 취소하시겠습니까?", async () => {
            try {
                await axiosInstance.delete(
                    `/vrs/vehicle-reservations/erase/${reservation.id}`,
                );
                setAlert("success", "예약이 취소되었습니다.");

                await fetchCars();
                console.log("🔄 [Reservation] Calling triggerRefresh()");
                triggerRefresh();
                console.log("✅ [Reservation] triggerRefresh() called");
                closeModal();
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string }>;
                setAlert(
                    "error",
                    axiosError.response?.data?.detail ||
                        "예약 취소에 실패했습니다.",
                );
            }
        });
    };

    const handleReturn = () => {
        if (!isEditMode || !reservation.id) return;

        setAlert("confirm", "차량을 반납하시겠습니까?", async () => {
            try {
                await axiosInstance.patch(
                    `/vrs/vehicle-reservations/update`,
                    {
                        ...reservation,
                        status: "FINISH",
                    },
                );
                setAlert("success", "차량이 반납되었습니다.");

                await fetchCars();
                triggerRefresh();
                closeModal();
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string }>;
                setAlert(
                    "error",
                    axiosError.response?.data?.detail ||
                        "차량 반납에 실패했습니다.",
                );
            }
        });
    };

    const selectedVehicle = modal?.vehicleId
        ? cars.find((car) => car.id === Number(modal.vehicleId))
        : null;

    useEffect(() => {
        if (!reservation.startDate || !reservation.endDate) return;

        const fetchValidation = async () => {
            setIsLoadingValidation(true);
            try {
                const res = await axiosInstance.get(
                    `/vrs/vehicles/validate?start=${reservation.startDate}&end=${reservation.endDate}`,
                );
                setValidates(res.data);
            } catch (error) {
                console.error("차량 유효성 검사 실패:", error);
                setValidates([]);
            } finally {
                setIsLoadingValidation(false);
            }
        };

        fetchValidation();
    }, [reservation.startDate, reservation.endDate]);

    return (
        <ModalContentContainer onSubmit={handleSubmit}>
            <ModalHeader>
                <h2>
                    {isEditMode
                        ? "차량 예약 수정"
                        : selectedVehicle
                          ? `${selectedVehicle.number} 차량 예약`
                          : "차량 예약"}
                </h2>
                <Xbutton onClick={closeModal}>✕</Xbutton>
            </ModalHeader>
            <ContentGrid>
                {/* 사용 시작 일시 */}
                <InputGroup>
                    <ModalLabel>사용 시작 일시</ModalLabel>
                    <DateTimeRow>
                        <StyledInput
                            type="date"
                            value={startParts.date}
                            onChange={(e) =>
                                handleDateTimeChange(
                                    "startDate",
                                    "date",
                                    e.target.value,
                                )
                            }
                        />
                        <Select
                            value={startParts.time}
                            onChange={(e) =>
                                handleDateTimeChange(
                                    "startDate",
                                    "time",
                                    e.target.value,
                                )
                            }
                            disabled={
                                modal?.reservationData?.status === "DRIVE"
                                    ? true
                                    : false
                            }
                        >
                            {timeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </DateTimeRow>
                </InputGroup>

                {/* 사용 종료 일시 */}
                <InputGroup>
                    <ModalLabel>사용 종료 일시</ModalLabel>
                    <DateTimeRow>
                        <StyledInput
                            type="date"
                            value={endParts.date}
                            onChange={(e) =>
                                handleDateTimeChange(
                                    "endDate",
                                    "date",
                                    e.target.value,
                                )
                            }
                        />
                        <Select
                            value={endParts.time}
                            onChange={(e) =>
                                handleDateTimeChange(
                                    "endDate",
                                    "time",
                                    e.target.value,
                                )
                            }
                        >
                            {timeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </DateTimeRow>
                </InputGroup>

                {!modal?.vehicleId && (
                    <InputGroup>
                        <ModalLabel>차량 선택</ModalLabel>
                        <Select
                            name="vehicleId"
                            value={reservation.vehicle.id}
                            onChange={handleChange}
                            disabled={isLoadingValidation}
                        >
                            <option value={0}>
                                {isLoadingValidation
                                    ? "예약 가능한 차량을 확인 중..."
                                    : "차량을 선택하세요"}
                            </option>
                            {validates.map((validationCar) => (
                                <option
                                    key={validationCar.vehicle.id}
                                    value={validationCar.vehicle.id}
                                    disabled={!validationCar.isAvailable}
                                >
                                    [{validationCar.vehicle.ownerType}]&nbsp;
                                    {validationCar.vehicle.number} -{" "}
                                    {validationCar.vehicle.name}
                                    {!validationCar.isAvailable
                                        ? " (예약 불가)"
                                        : ""}
                                </option>
                            ))}
                        </Select>
                        {!isLoadingValidation &&
                            validates.length === 0 &&
                            reservation.startDate &&
                            reservation.endDate && (
                                <ValidationMessage>
                                    선택한 시간대에 예약 가능한 차량이 없습니다.
                                </ValidationMessage>
                            )}
                    </InputGroup>
                )}
                <InputGroup>
                    <ModalLabel>목적지</ModalLabel>
                    <StyledInput
                        type="text"
                        name="destination"
                        value={reservation.destination}
                        placeholder="목적지를 입력하세요."
                        onChange={handleChange}
                    />
                </InputGroup>

                <FullWidthInputGroup>
                    <ModalLabel>비고</ModalLabel>
                    <StyledTextarea
                        rows={4}
                        name="content"
                        value={reservation.content}
                        onChange={handleChange}
                        placeholder="추가 정보를 입력하세요."
                    />
                </FullWidthInputGroup>
            </ContentGrid>
            <ModalFooter>
                {isEditMode && reservation.status === "WAITING" && (
                    <Button
                        type="button"
                        variant="danger"
                        onClick={handleDelete}
                        style={{ marginRight: "auto" }}
                        disabled={isSubmitting}
                    >
                        예약 취소
                    </Button>
                )}
                {isEditMode && reservation.status === "DRIVE" && (
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleReturn}
                        style={{ marginRight: "auto" }}
                        disabled={isSubmitting}
                    >
                        차량 반납
                    </Button>
                )}
                <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={isSubmitting}
                >
                    취소
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting
                        ? isEditMode
                            ? "수정 중..."
                            : "등록 중..."
                        : isEditMode
                          ? "수정"
                          : "등록"}
                </Button>
            </ModalFooter>
        </ModalContentContainer>
    );
};

export default Reservation;

const ContentGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1.5rem;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

const FullWidthInputGroup = styled(InputGroup)`
    grid-column: 1 / -1;
`;

const DateTimeRow = styled.div`
    display: flex;
    gap: 0.5rem;

    /* date input은 더 넓게, time select는 좁게 */
    input[type="date"] {
        flex: 1.2;
        min-width: 0;
    }

    select {
        flex: 0.8;
        min-width: 0;
    }
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

    &:disabled {
        background-color: #f9fafb;
        color: #6b7280;
        cursor: not-allowed;
    }
`;

const ValidationMessage = styled.div`
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #92400e;
    text-align: center;
`;
