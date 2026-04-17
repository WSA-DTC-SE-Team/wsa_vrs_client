"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import useUserStore from "@/lib/stores/userStore";
import { useModalStore } from "@/lib/stores/modalStore";
import useAlertStore from "@/lib/stores/alertStore";

interface Reservation {
    id: number;
    destination: string | null;
    content: string | null;
    usageType: string | null;
    startDate: string;
    endDate: string | null;
    status: string;
    vehicle: { id: number; number: string; name: string };
    employee: { id: number };
}

const DriveStatusBanner = () => {
    const { user } = useUserStore();
    const { refreshKey, openModal, triggerRefresh } = useModalStore();
    const { setAlert } = useAlertStore();
    const [activeReservation, setActiveReservation] =
        useState<Reservation | null>(null);
    const [isReturning, setIsReturning] = useState(false);
    useEffect(() => {
        if (!user?.employeeNumber) return;

        const fetchDriveReservations = async () => {
            try {
                const res = await axiosInstance.get(
                    `/vrs/vehicle-reservations/my?status=DRIVE,WAITING&sort=startDate.desc`,
                );
                const reservations: Reservation[] = res.data.content;

                if (reservations.length > 0) {
                    // 서버에서 이미 정렬된 데이터의 첫 번째 항목 (가장 최근)
                    setActiveReservation(reservations[0]);
                } else {
                    setActiveReservation(null);
                }
            } catch (error) {
                setAlert(
                    "error",
                    "예약 내역 조회에 실패하였습니다. 다시 시도해주세요.",
                );
                setActiveReservation(null);
            }
        };

        fetchDriveReservations();
    }, [user?.id, refreshKey]);

    const handleReturn = async () => {
        if (!activeReservation) return;
        setIsReturning(true);

        try {
            const now = new Date();

            const pad = (n: number) => String(n).padStart(2, "0");

            // 30분 단위로 올림
            const minutes = now.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 30) * 30;

            // 60분이 되면 다음 시간으로 넘김
            const endDateTime = new Date(now);

            if (roundedMinutes === 60) {
                endDateTime.setHours(endDateTime.getHours() + 1);
                endDateTime.setMinutes(0);
                endDateTime.setSeconds(0);
                endDateTime.setMilliseconds(0);
            } else {
                endDateTime.setMinutes(roundedMinutes);
                endDateTime.setSeconds(0);
                endDateTime.setMilliseconds(0);
            }

            const endDate = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())}T${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}:00`;
            const formattedStartDate = activeReservation.startDate.replace(
                " ",
                "T",
            );

            const updatePayload = {
                ...activeReservation,
                employee: {
                    id: user?.id,
                },
                vehicle: {
                    id: activeReservation.vehicle.id,
                },
                startDate: formattedStartDate,
                endDate,
                status: "FINISH",
            };

            const response = await axiosInstance.patch(
                `/vrs/vehicle-reservations/update`,
                updatePayload,
            );

            // 반납 성공 후 운행일지 작성 확인 알람
            // 필요한 값들을 미리 추출 (클로저 문제 방지)
            const vehicleIdForModal = activeReservation.vehicle.id.toString();
            const destinationForModal = activeReservation.destination || "";
            const employeeIdForModal =
                activeReservation.employee?.id || user?.id || 0;

            // setAlert를 먼저 호출하고, 나중에 refresh
            setAlert(
                "confirm",
                "차량 반납이 완료되었습니다.\n해당 차량 운행일지를 작성하시겠습니까?",
                () => {
                    openModal(
                        "NEW_RECORD",
                        vehicleIdForModal,
                        undefined,
                        formattedStartDate,
                        endDate,
                        {
                            destination: destinationForModal,
                            content: destinationForModal,
                        },
                    );
                },
            );

            // Alert 표시 후 상태 업데이트 (배너 숨기기)
            setActiveReservation(null);
            triggerRefresh();
        } catch (error) {
            setAlert("error", "차량 반납에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsReturning(false);
        }
    };

    if (!activeReservation) return null;

    return (
        <Banner>
            <BannerContent>
                <DotPulse />
                <BannerText>
                    <strong className="text">
                        현재 차량 예약 내역이 있습니다.
                    </strong>
                    {activeReservation?.destination && (
                        <span>
                            {" "}
                            [{activeReservation.destination}]&nbsp;
                            {activeReservation.vehicle.name} (
                            {activeReservation.vehicle.number}){" "}
                        </span>
                    )}
                </BannerText>
            </BannerContent>
            <ReturnButton onClick={handleReturn} disabled={!activeReservation}>
                {isReturning ? "처리 중..." : "차량 반납"}
            </ReturnButton>
        </Banner>
    );
};

export default DriveStatusBanner;

const Banner = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    gap: 1rem;

    @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
        padding: 1.5rem 1.25rem;

        span {
            font-weight: bold;
        }

        .text {
            font-size: 1.2rem;
        }
    }
`;

const BannerContent = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
`;

const DotPulse = styled.div`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #3b82f6;
    flex-shrink: 0;
    animation: pulse 1.5s ease-in-out infinite;

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.4;
            transform: scale(1.3);
        }
    }
`;

const BannerText = styled.p`
    font-size: 0.875rem;
    color: #1e40af;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    strong {
        font-weight: 600;
    }

    span {
        color: #3b82f6;
    }
`;

const ReturnButton = styled.button`
    flex-shrink: 0;
    padding: 0.4rem 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #2563eb;
    }

    &:disabled {
        background-color: #93c5fd;
        cursor: not-allowed;
    }

    @media (max-width: 768px) {
        width: 100%;
        padding: 1rem;
        font-size: 0.9375rem;
    }
`;
