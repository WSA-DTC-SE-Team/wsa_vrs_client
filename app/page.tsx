"use client";

import styles from "@/components/layout/style/layout.module.css";
import AddButton from "./components/features/AddButton";
import styled from "@emotion/styled";
import { useCarStore } from "./lib/stores/carStore";
import { useRouter } from "next/navigation";
import { useModalStore } from "./lib/stores/modalStore";
import SearchBar from "./components/common/SearchBar";
import ReservationTimeline from "./components/common/ReservationTimeline";
import DriveStatusBanner from "./components/common/DriveStatusBanner";
import { useState, useMemo, useEffect } from "react";
import axiosInstance from "./lib/axios";

// Styled Components
const ContentBox = styled.div`
    background-color: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const VehicleList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
`;

const VehicleCard = styled.div`
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-color: #3b82f6;
    }

    &:last-of-type {
        margin-bottom: 1rem;

        @media (max-width: 1023px) {
            margin-bottom: calc(80px + env(safe-area-inset-bottom));
        }
    }
`;

const VehicleHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
`;

const VehicleNumber = styled.h3`
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
`;

const VehicleName = styled.span`
    font-size: 0.875rem;
    color: #6b7280;
`;

const VehicleInfo = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
`;

const InfoBadge = styled.span`
    background-color: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
`;

// 연료 유형 매핑
const FUEL_TYPE_MAP: Record<string, string> = {
    DIESEL: "경유",
    GAS: "휘발유",
    GASOLINE: "휘발유",
    ELECTRIC: "전기",
};

export default function Home() {
    const { cars } = useCarStore();
    const { openModal } = useModalStore();
    const router = useRouter();

    // 모바일 여부 상태
    const [isMobile, setIsMobile] = useState(false);

    // 검색 상태
    const [searchType, setSearchType] = useState("number");
    const [searchKeyword, setSearchKeyword] = useState("");

    // ownerType: 렌더링 중 localStorage 읽기 (hydration 안전)
    const getInitialOwnerType = () => {
        if (typeof window === "undefined") return "ALL";
        const saved = localStorage.getItem("ownerType");
        console.log("🔍 localStorage 불러오기:", saved);
        return saved || "ALL";
    };

    const [ownerType, setOwnerType] = useState(getInitialOwnerType);

    // ownerType 변경 시 localStorage에 저장
    const handleOwnerTypeChange = (newOwnerType: string) => {
        setOwnerType(newOwnerType);
        localStorage.setItem("ownerType", newOwnerType);
    };

    // 화면 크기 감지
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // 검색 옵션
    const searchOptions = [{ value: "number", label: "기종+차량 번호" }];

    // 검색 처리
    const handleSearch = (type: string, keyword: string) => {
        setSearchType(type);
        setSearchKeyword(keyword);
    };

    // 필터링된 차량 데이터
    const filteredCars = useMemo(() => {
        let result = cars;

        // ownerType 필터링
        if (ownerType !== "ALL") {
            result = result.filter((car) => car.ownerType === ownerType);
        }

        // 검색 키워드 필터링
        if (searchKeyword) {
            result = result.filter((car) => {
                const keyword = searchKeyword.toLowerCase();
                const number = car.number?.toLowerCase() || "";
                const name = car.name?.toLowerCase() || "";
                return number.includes(keyword) || name.includes(keyword);
            });
        }

        return result;
    }, [cars, searchKeyword, ownerType]);

    // 페이지 접속 시 오늘 예약 체크

    return (
        <div className={styles.mainpage}>
            <DriveStatusBanner />
            <div className={styles.buttonbox}>
                <div className={styles.box_inner}>
                    <AddButton modalType="NEW_RESERVATION" title="예약 등록" />
                    <AddButton modalType="NEW_RECORD" title="운행 내역 등록" />
                </div>

                <div>
                    <AddButton modalType="NEW_CAR" title="신규 차량 등록" />
                </div>
            </div>

            <ContentBox>
                <SearchBar
                    searchOptions={searchOptions}
                    onSearch={handleSearch}
                    placeholder="차량 번호 또는 모델로 검색"
                    showOwnerTypeFilter={true}
                    onOwnerTypeChange={handleOwnerTypeChange}
                    ownerType={ownerType}
                />

                {isMobile ? (
                    <VehicleList>
                        {filteredCars.map((car) => (
                            <VehicleCard
                                key={car.id}
                                onClick={() =>
                                    router.push(`/vehicles/${car.id}`)
                                }
                            >
                                <VehicleHeader>
                                    <VehicleNumber>{car.number}</VehicleNumber>
                                    <VehicleName>{car.name}</VehicleName>
                                </VehicleHeader>
                                <VehicleInfo>
                                    <InfoBadge>
                                        {FUEL_TYPE_MAP[car.fuelType] ||
                                            car.fuelType}
                                    </InfoBadge>
                                    {car.inspectionDate && (
                                        <InfoBadge>
                                            검사: {car.inspectionDate}
                                        </InfoBadge>
                                    )}
                                </VehicleInfo>
                            </VehicleCard>
                        ))}
                    </VehicleList>
                ) : (
                    <ReservationTimeline
                        searchKeyword={searchKeyword}
                        ownerType={ownerType}
                    />
                )}
            </ContentBox>
        </div>
    );
}
