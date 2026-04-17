"use client";

import { Car } from "@/lib/stores/carStore";
import { useModalStore } from "@/lib/stores/modalStore";
import styled from "@emotion/styled";
import { useRouter } from "next/navigation";

interface CarCardProps {
    car: Car;
}

// 연료 유형 매핑
const FUEL_TYPE_MAP: Record<string, string> = {
    DIESEL: "경유",
    GAS: "휘발유",
    ELECTRIC: "전기",
};

// 차량 상태 매핑
const VEHICLE_STATUS_MAP: Record<string, string> = {
    GARAGE: "차고지",
    DRIVING: "운행중",
    INSPECTION: "점검중",
    BROKEN: "고장",
};

// 차량 상태별 색상 설정
const VEHICLE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    GARAGE: { bg: "#d1fae5", text: "#065f46" },
    DRIVE: { bg: "#dbeafe", text: "#1e40af" },
    INSPECTION: { bg: "#fef3c7", text: "#92400e" },
    BROKEN: { bg: "#fee2e2", text: "#991b1b" },
};

const CarCard = ({ car }: CarCardProps) => {
    const route = useRouter();
    const { openModal } = useModalStore();

    const statusColor = VEHICLE_STATUS_COLORS[car.vehicleStatus || ""] || {
        bg: "#f3f4f6",
        text: "#374151",
    };

    return (
        <CardContainer>
            <CardHeader>
                <CarNumber>{car.number}</CarNumber>
                <StatusBadge bg={statusColor.bg} color={statusColor.text}>
                    {VEHICLE_STATUS_MAP[car.vehicleStatus || ""] ||
                        car.vehicleStatus}
                </StatusBadge>
            </CardHeader>
            <CarModel>{car.name}</CarModel>
            <CardBody>
                <InfoRow>
                    <Label>차량 등록일</Label>
                    <Value>{car.registerDate}</Value>
                </InfoRow>
                <InfoRow>
                    <Label>운행 개시일</Label>
                    <Value>{car.drivingDate}</Value>
                </InfoRow>
                <InfoRow>
                    <Label>연료 유형</Label>
                    <Value>{FUEL_TYPE_MAP[car.fuelType] || car.fuelType}</Value>
                </InfoRow>
                <InfoRow>
                    <Label>최근 검사일</Label>
                    <Value>{car.inspectionDate}</Value>
                </InfoRow>
                {car.content && (
                    <InfoRow>
                        <Label>비고</Label>
                        <Value>{car.content}</Value>
                    </InfoRow>
                )}
            </CardBody>
            <CardFooter>
                <EditButton>수정</EditButton>
                <DeleteButton>삭제</DeleteButton>
                <ReservationButton onClick={() => openModal("NEW_RESERVATION")}>
                    차량 예약
                </ReservationButton>
                <DetailButton onClick={() => route.push(`vehicles/${car?.id}`)}>
                    운행 내역 조회
                </DetailButton>
            </CardFooter>
        </CardContainer>
    );
};

export default CarCard;

const CardContainer = styled.div`
    background: white;
    border-radius: 0.75rem;
    padding: 1.25rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    transition: all 0.2s;

    &:hover {
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
`;

const CarNumber = styled.h3`
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
`;

const StatusBadge = styled.span<{ bg: string; color: string }>`
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${(props) => props.bg};
    color: ${(props) => props.color};
`;

const CarModel = styled.div`
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1rem;
    font-weight: 500;
`;

const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
`;

const InfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Label = styled.span`
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
`;

const Value = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 600;
`;

const CardFooter = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
`;

const EditButton = styled.button`
    width: 49%;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: white;
    color: #374151;
    transition: all 0.2s;

    &:hover {
        background-color: #f9fafb;
    }
`;

const DeleteButton = styled.button`
    width: 49%;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #ef4444;
    border-radius: 0.375rem;
    background-color: white;
    color: #ef4444;
    transition: all 0.2s;

    &:hover {
        background-color: #fef2f2;
    }
`;

const DetailButton = styled.button`
    width: 100%;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #ef4444;
    border-radius: 0.375rem;
    background-color: white;
    color: rgb(44, 100, 233);
    border: 1px solid rgb(44, 100, 233);
    transition: all 0.2s;

    &:hover {
        background-color: rgb(44, 100, 233);
        color: #fff;
    }
`;

const ReservationButton = styled(DeleteButton)`
    width: 100%;
    color: #059c6a;
    border: 1px solid #059c6a;
    &:hover {
        background-color: #059c6a;
        color: #fff;
    }
`;
