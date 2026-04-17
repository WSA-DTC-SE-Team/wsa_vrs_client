"use client";

import styled from "@emotion/styled";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface AdvancedPaginationProps {
    totalItems: number;
    defaultPageSize?: number;
    pageSizeOptions?: number[];
}

const AdvancedPagination = ({
    totalItems,
    defaultPageSize = 20,
    pageSizeOptions = [10, 20, 50, 100, 0],
}: AdvancedPaginationProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL에서 현재 페이지와 사이즈 가져오기 (0-based)
    const currentPage = Number(searchParams.get("page")) || 0;
    const sizeParam = searchParams.get("size");
    const allParam = searchParams.get("all");

    // all=true이면 전체 보기 모드
    const isShowAll = allParam === "true";
    const pageSize = isShowAll ? 0 : (sizeParam !== null ? Number(sizeParam) : defaultPageSize);
    const effectivePageSize = isShowAll ? totalItems : pageSize;

    const totalPages = Math.ceil(totalItems / effectivePageSize);
    const startIndex = isShowAll ? 1 : currentPage * effectivePageSize + 1;
    const endIndex = isShowAll ? totalItems : Math.min((currentPage + 1) * effectivePageSize, totalItems);
    const displayPage = currentPage + 1; // 사용자에게 보여줄 페이지 (1-based)

    // URL 업데이트 헬퍼 함수
    const updateURL = (page: number, size: number) => {
        const params = new URLSearchParams(searchParams.toString());

        // size=0 (전체 보기)일 때는 page=0&all=true (size만 제거)
        if (size === 0) {
            params.delete("size");
            params.delete("all");
            params.set("page", "0");
            params.set("all", "true");
        } else {
            params.delete("all");
            params.delete("size");
            params.set("page", String(page));
            params.set("size", String(size));
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    // 페이지 변경 핸들러
    const handlePageChange = (page: number) => {
        if (page >= 0 && page < totalPages) {
            updateURL(page, pageSize);
        }
    };

    // 페이지 사이즈 변경 핸들러
    const handlePageSizeChange = (newSize: number) => {
        updateURL(0, newSize); // 사이즈 변경 시 0페이지로 이동
    };

    // 이전 페이지
    const handlePrevious = () => {
        if (currentPage > 0) {
            handlePageChange(currentPage - 1);
        }
    };

    // 다음 페이지
    const handleNext = () => {
        if (currentPage < totalPages - 1) {
            handlePageChange(currentPage + 1);
        }
    };

    // 첫 페이지
    const handleFirst = () => {
        handlePageChange(0);
    };

    // 마지막 페이지
    const handleLast = () => {
        handlePageChange(totalPages - 1);
    };

    if (totalItems === 0) return null;

    return (
        <PaginationContainer>
            <LeftSection>
                <InfoText>
                    총 {totalItems}개 중 {startIndex}-{endIndex}개 표시
                </InfoText>
                <PageSizeSelector>
                    <Select
                        value={pageSize}
                        onChange={(e) =>
                            handlePageSizeChange(Number(e.target.value))
                        }
                    >
                        {pageSizeOptions.map((option) => (
                            <option key={option} value={option}>
                                {option === 0 ? "전체 보기" : `${option}개씩`}
                            </option>
                        ))}
                    </Select>
                </PageSizeSelector>
            </LeftSection>

            {!isShowAll && (
                <RightSection>
                    <NavButton onClick={handleFirst} disabled={currentPage === 0}>
                        처음
                    </NavButton>
                    <NavButton
                        onClick={handlePrevious}
                        disabled={currentPage === 0}
                    >
                        이전
                    </NavButton>
                    <PageInfo>
                        {displayPage} / {totalPages}
                    </PageInfo>
                    <NavButton
                        onClick={handleNext}
                        disabled={currentPage === totalPages - 1}
                    >
                        다음
                    </NavButton>
                    <NavButton
                        onClick={handleLast}
                        disabled={currentPage === totalPages - 1}
                    >
                        마지막
                    </NavButton>
                </RightSection>
            )}
        </PaginationContainer>
    );
};

export default AdvancedPagination;

// Styled Components
const PaginationContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    margin-top: 1rem;
    gap: 1rem;

    @media (max-width: 768px) {
        flex-direction: column;
        padding: 1rem;
    }
`;

const LeftSection = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;

    @media (max-width: 768px) {
        width: 100%;
        justify-content: space-between;
    }
`;

const InfoText = styled.span`
    font-size: 0.875rem;
    color: #6b7280;
    white-space: nowrap;
`;

const PageSizeSelector = styled.div`
    display: flex;
    align-items: center;
`;

const Select = styled.select`
    padding: 0.375rem 2rem 0.375rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background-color: white;
    cursor: pointer;
    transition: border-color 0.15s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:hover {
        border-color: #9ca3af;
    }
`;

const RightSection = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;

    @media (max-width: 768px) {
        width: 100%;
        justify-content: center;
    }
`;

const PageInfo = styled.span`
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    min-width: 60px;
    text-align: center;
`;

const NavButton = styled.button`
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: white;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background-color: #f9fafb;
        border-color: #9ca3af;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #f9fafb;
    }
`;
