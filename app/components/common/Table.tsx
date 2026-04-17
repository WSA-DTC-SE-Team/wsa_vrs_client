"use client";

import styled from "@emotion/styled";
import { ReactNode } from "react";

// Table Container
export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    background-color: white;

    /* 모바일 */
    @media (max-width: 767px) {
        font-size: 0.875rem;
    }
`;

// Table Header
export const THead = styled.thead`
    background-color: #e8f4f8;
    border-top: 1px solid #d1d5db;
    border-bottom: 1px solid #d1d5db;
`;

// Table Body
export const TBody = styled.tbody`
    background-color: white;
`;

// Table Row (thead용)
export const THeadRow = styled.tr`
    border-bottom: 1px solid #e5e7eb;
`;

// Table Row (tbody용)
export const TRow = styled.tr`
    transition: background-color 0.15s ease;

    &:not(:last-child) {
        border-bottom: 1px solid #d1d5db;
    }

    &:hover {
        background-color: #f9fafb;
    }

    /* 모바일 */
    @media (max-width: 767px) {
        &:hover {
            background-color: white;
        }
    }
`;

// Table Header Cell
export const TH = styled.th`
    padding: 0.5rem 1rem;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    vertical-align: middle;
    line-height: 1.2;

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.5rem 0.75rem;
        font-size: 0.8125rem;
    }
`;

// Table Data Cell
export const TD = styled.td`
    padding: 1rem;
    font-size: 0.875rem;
    color: #1f2937;
    vertical-align: middle;
    text-align: center;

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.75rem;
        font-size: 0.8125rem;
    }
`;

// Table Wrapper (스크롤 지원)
export const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    margin-top: 1rem;

    /* 커스텀 스크롤바 */
    &::-webkit-scrollbar {
        height: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
    }

    /* 모바일 */
    @media (max-width: 767px) {
        border-radius: 0.375rem;
    }
`;

// 빈 상태 표시
export const EmptyState = styled.div`
    padding: 3rem 1rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
`;

// Table Caption (선택적)
export const TableCaption = styled.caption`
    padding: 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    text-align: left;
    caption-side: top;

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.75rem;
        font-size: 0.9375rem;
    }
`;

// 사용 예시를 위한 타입 정의
interface TableComponentProps {
    children: ReactNode;
}

// 컴포넌트 기반 래퍼 (선택적 사용)
export const TableContainer = ({ children }: TableComponentProps) => {
    return (
        <TableWrapper>
            <Table>{children}</Table>
        </TableWrapper>
    );
};
