"use client";

import { useCarStore } from "@/lib/stores/carStore";
import useUserStore from "@/lib/stores/userStore";
import styled from "@emotion/styled";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Styled Components
const NavContainer = styled.nav`
    width: 250px;
    height: calc(100vh - 48px);
    position: fixed;
    top: 48px;
    background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
    border-right: 1px solid #e5e7eb;
    padding: 0;
    z-index: 40;
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;

    /* 커스텀 스크롤바 */
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
    }

    @media (max-width: 1023px) {
        display: none;
    }
`;

const NavHeader = styled.div`
    padding: 1.5rem 1rem 1rem 1rem;
    border-bottom: 2px solid #e5e7eb;
    background-color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
`;

const NavTitle = styled.h3`
    font-size: 1rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
    letter-spacing: -0.02em;
`;

const CarCount = styled.span`
    background: linear-gradient(135deg, #2c64e9 0%, #1e4fd9 100%);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    border-radius: 1rem;
    min-width: 1.5rem;
    text-align: center;
    box-shadow: 0 2px 4px rgba(44, 100, 233, 0.2);
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
`;

const EmptyIcon = styled.div`
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.3;
`;

const EmptyText = styled.p`
    font-size: 0.875rem;
    color: #9ca3af;
    margin: 0;
`;

const CarListContainer = styled.div`
    padding: 0.5rem;
    flex: 1;
    overflow-y: auto;
`;

const CarItem = styled.div<{ isSelected: boolean }>`
    display: flex;
    align-items: center;
    padding: 0.875rem;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: ${(props) => (props.isSelected ? "#eff6ff" : "white")};
    border: 2px solid
        ${(props) => (props.isSelected ? "#2c64e9" : "transparent")};
    box-shadow: ${(props) =>
        props.isSelected
            ? "0 4px 6px rgba(44, 100, 233, 0.15)"
            : "0 1px 3px rgba(0, 0, 0, 0.05)"};

    &:hover {
        background-color: ${(props) =>
            props.isSelected ? "#eff6ff" : "#f9fafb"};
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
`;

const CarIconBox = styled.div`
    font-size: 1.5rem;
    margin-right: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    filter: grayscale(100%);
`;

const CarInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
`;

const CarNumber = styled.div`
    font-size: 0.875rem;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: -0.01em;
`;

const CarModel = styled.div`
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
`;

const CarBadge = styled.span<{ fuelType: string }>`
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    white-space: nowrap;
    background-color: ${(props) => {
        const type = props.fuelType?.toUpperCase();
        switch (type) {
            case "GASOLINE":
            case "GAS":
                return "#fef3c7";
            case "DIESEL":
                return "#dbeafe";
            case "LPG":
                return "#e0e7ff";
            case "ELECTRIC":
                return "#d1fae5";
            default:
                return "#f3f4f6";
        }
    }};
    color: ${(props) => {
        const type = props.fuelType?.toUpperCase();
        switch (type) {
            case "GASOLINE":
            case "GAS":
                return "#92400e";
            case "DIESEL":
                return "#1e40af";
            case "LPG":
                return "#4338ca";
            case "ELECTRIC":
                return "#065f46";
            default:
                return "#374151";
        }
    }};
`;

// Navigation Menu Styles
const NavMenuSection = styled.div`
    border-top: 2px solid #e5e7eb;
    background-color: white;
    padding: 0.75rem 0.5rem;
`;

const NavMenuItem = styled.div<{ isActive: boolean }>`
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    margin-bottom: 0.25rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: ${(props) =>
        props.isActive ? "#eff6ff" : "transparent"};
    color: ${(props) => (props.isActive ? "#2c64e9" : "#6b7280")};

    &:hover {
        background-color: ${(props) =>
            props.isActive ? "#eff6ff" : "#f9fafb"};
        color: ${(props) => (props.isActive ? "#2c64e9" : "#1f2937")};
    }

    &:last-child {
        margin-bottom: 0;
    }
`;

const NavMenuText = styled.span`
    font-size: 0.875rem;
    font-weight: 500;
`;

// Components
const Navigation = () => {
    const { cars } = useCarStore();
    const { user } = useUserStore();
    const employeeId = user?.id || 0;
    const router = useRouter();
    const today = new Date();

    const kstDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(today);

    const pathname = usePathname();
    const year = new Date(kstDate).getFullYear();
    const menuItems = [
        {
            label: "나의 기록 조회",
            path: `/my-records/${employeeId}/reservation/${year}-01-01/${kstDate}`,
            includes: `/my-records/${employeeId}`,
        },
        // {
        //     label: "연도별 운행일지",
        //     path: `/annual-records/${year}`,
        //     includes: "/annual-records",
        // },
    ];

    return (
        <NavContainer>
            <NavHeader>
                <NavTitle>차량 목록</NavTitle>
                <CarCount>{cars.length}</CarCount>
            </NavHeader>
            {cars.length > 0 ? (
                <CarList />
            ) : (
                <EmptyState>
                    <EmptyIcon>🚗</EmptyIcon>
                    <EmptyText>등록된 차량이 없습니다</EmptyText>
                </EmptyState>
            )}
            <NavMenuSection>
                {menuItems.map((item, index) => (
                    <NavMenuItem
                        key={index}
                        isActive={
                            pathname === item.path ||
                            pathname.startsWith(item.includes)
                        }
                        onClick={() => router.push(item.path)}
                    >
                        <NavMenuText>{item.label}</NavMenuText>
                    </NavMenuItem>
                ))}
            </NavMenuSection>
        </NavContainer>
    );
};

const CarList = () => {
    const { cars } = useCarStore();

    const route = useRouter();
    const path = usePathname();

    return (
        <CarListContainer>
            {cars.map((car) => (
                <CarItem
                    onClick={() =>
                        route.push(`/vehicles/${car.id}/drivingLogs`)
                    }
                    key={car.id}
                    isSelected={path.split("/")[2] === String(car.id)}
                >
                    <CarIconBox>🚗</CarIconBox>
                    <CarInfo>
                        <CarNumber>{car.number}</CarNumber>
                        <CarModel>{car.name}</CarModel>
                    </CarInfo>
                    <CarBadge fuelType={car.fuelType}>
                        {car.fuelType === "GASOLINE" || car.fuelType === "GAS"
                            ? "휘발유"
                            : car.fuelType === "DIESEL"
                              ? "경유"
                              : car.fuelType === "LPG" || car.fuelType === "lpg"
                                ? "LPG"
                                : car.fuelType === "ELECTRIC" ||
                                    car.fuelType === "electric"
                                  ? "전기"
                                  : car.fuelType}
                    </CarBadge>
                </CarItem>
            ))}
        </CarListContainer>
    );
};

export default Navigation;
