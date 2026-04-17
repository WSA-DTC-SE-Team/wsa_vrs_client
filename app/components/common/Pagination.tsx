"use client";

import styled from "@emotion/styled";

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const Pagination = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
}: PaginationProps) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageClick = (page: number) => {
        onPageChange(page);
    };

    // 페이지 번호 생성 (현재 페이지 기준 앞뒤 2개씩)
    const getPageNumbers = () => {
        const pages: number[] = [];
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <PaginationContainer>
            <PageInfo>
                총 {totalItems}개 | {currentPage} / {totalPages}
            </PageInfo>
            <PageButtons>
                <PageButton
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    처음
                </PageButton>
                <PageButton onClick={handlePrevPage} disabled={currentPage === 1}>
                    이전
                </PageButton>
                {getPageNumbers().map((page) => (
                    <PageNumber
                        key={page}
                        active={page === currentPage}
                        onClick={() => handlePageClick(page)}
                    >
                        {page}
                    </PageNumber>
                ))}
                <PageButton
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    다음
                </PageButton>
                <PageButton
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    끝
                </PageButton>
            </PageButtons>
        </PaginationContainer>
    );
};

export default Pagination;

const PaginationContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    margin-top: 1rem;

    @media (max-width: 768px) {
        flex-direction: column;
        gap: 1rem;
    }
`;

const PageInfo = styled.div`
    font-size: 0.875rem;
    color: #6b7280;
`;

const PageButtons = styled.div`
    display: flex;
    gap: 0.25rem;
    align-items: center;
`;

const PageButton = styled.button`
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: white;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #f9fafb;
        border-color: #9ca3af;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const PageNumber = styled.button<{ active: boolean }>`
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid ${(props) => (props.active ? "#3b82f6" : "#d1d5db")};
    border-radius: 0.375rem;
    background-color: ${(props) => (props.active ? "#3b82f6" : "white")};
    color: ${(props) => (props.active ? "white" : "#374151")};
    cursor: pointer;
    transition: all 0.15s ease;
    font-weight: ${(props) => (props.active ? "600" : "400")};

    &:hover {
        background-color: ${(props) => (props.active ? "#2563eb" : "#f9fafb")};
        border-color: ${(props) => (props.active ? "#2563eb" : "#9ca3af")};
    }
`;
