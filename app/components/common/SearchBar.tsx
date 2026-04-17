"use client";

import styled from "@emotion/styled";
import { useEffect, useState, useRef } from "react";

interface SearchBarProps {
    searchOptions: { value: string; label: string }[];
    onSearch: (
        searchType: string,
        searchKeyword: string,
        sortField?: string,
        sortOrder?: string,
        startDate?: string,
        endDate?: string,
        ownerType?: string,
    ) => void;
    placeholder?: string;
    sortOptions?: { value: string; label: string }[];
    showDateFilter?: boolean;
    showOwnerTypeFilter?: boolean;
    onOwnerTypeChange?: (ownerType: string) => void;
    ownerType?: string;
    initialStartDate?: string;
    initialEndDate?: string;
}

const SearchBar = ({
    searchOptions,
    onSearch,
    placeholder = "검색...",
    sortOptions,
    showDateFilter = false,
    showOwnerTypeFilter = false,
    onOwnerTypeChange,
    ownerType: externalOwnerType,
    initialStartDate = "",
    initialEndDate = "",
}: SearchBarProps) => {
    const [localOwnerType, setLocalOwnerType] = useState("");
    const [searchType, setSearchType] = useState(searchOptions[0]?.value || "");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [sortField, setSortField] = useState(sortOptions?.[0]?.value || "");
    const [sortOrder, setSortOrder] = useState("DESC");
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);

    // 외부에서 전달된 ownerType 사용 (없으면 기본값 "ALL")
    const ownerType = externalOwnerType || "ALL";

    useEffect(() => {
        if (ownerType !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalOwnerType(ownerType as string);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalOwnerType("ALL");
        }
    }, [ownerType]);

    // initialStartDate, initialEndDate가 변경되면 state 업데이트
    const prevInitialStartDate = useRef(initialStartDate);
    const prevInitialEndDate = useRef(initialEndDate);

    useEffect(() => {
        if (prevInitialStartDate.current !== initialStartDate) {
            prevInitialStartDate.current = initialStartDate;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStartDate(initialStartDate);
        }
        if (prevInitialEndDate.current !== initialEndDate) {
            prevInitialEndDate.current = initialEndDate;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEndDate(initialEndDate);
        }
    }, [initialStartDate, initialEndDate]);

    const handleSearch = () => {
        // 날짜 필터가 활성화된 경우, 하나만 선택되었으면 같은 날짜로 자동 반영
        let finalStartDate = startDate;
        let finalEndDate = endDate;

        if (showDateFilter) {
            if (startDate && !endDate) {
                finalEndDate = startDate;
            } else if (!startDate && endDate) {
                finalStartDate = endDate;
            }
        }

        onSearch(
            searchType,
            searchKeyword,
            sortField,
            sortOrder,
            finalStartDate,
            finalEndDate,
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleReset = () => {
        setSearchKeyword("");
        setStartDate("");
        setEndDate("");
        onSearch(searchType, "", sortField, sortOrder, "", "", "ALL");
        if (onOwnerTypeChange) {
            onOwnerTypeChange("ALL");
        }
    };

    const handleOwnerTypeChange = (newOwnerType: string) => {
        if (onOwnerTypeChange) {
            onOwnerTypeChange(newOwnerType);
        }
    };

    // 정렬 필드 변경 시 바로 실행
    const handleSortFieldChange = (newSortField: string) => {
        setSortField(newSortField);
        onSearch(
            searchType,
            searchKeyword,
            newSortField,
            sortOrder,
            startDate,
            endDate,
        );
    };

    // 정렬 순서 변경 시 바로 실행
    const handleSortOrderChange = (newSortOrder: string) => {
        setSortOrder(newSortOrder);
        onSearch(
            searchType,
            searchKeyword,
            sortField,
            newSortOrder,
            startDate,
            endDate,
        );
    };

    return (
        <>
            {showOwnerTypeFilter && (
                <OwnerTypeFilterContainer>
                    <OwnerTypeLabel>
                        <OwnerTypeInput
                            type="radio"
                            name="ownerType"
                            value="ALL"
                            checked={localOwnerType === "ALL"}
                            onChange={(e) =>
                                handleOwnerTypeChange(e.target.value)
                            }
                        />
                        <span>전체</span>
                    </OwnerTypeLabel>
                    <OwnerTypeLabel>
                        <OwnerTypeInput
                            type="radio"
                            name="ownerType"
                            value="DT"
                            checked={localOwnerType === "DT"}
                            onChange={(e) =>
                                handleOwnerTypeChange(e.target.value)
                            }
                        />
                        <span>DT</span>
                    </OwnerTypeLabel>
                    <OwnerTypeLabel>
                        <OwnerTypeInput
                            type="radio"
                            name="ownerType"
                            value="HQ"
                            checked={localOwnerType === "HQ"}
                            onChange={(e) =>
                                handleOwnerTypeChange(e.target.value)
                            }
                        />
                        <span>본사</span>
                    </OwnerTypeLabel>
                </OwnerTypeFilterContainer>
            )}
            <SearchContainer>
                <SearchSelect
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                >
                    {searchOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </SearchSelect>
                <SearchInput
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                />
                {showDateFilter && (
                    <>
                        <DateInput
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="시작일"
                        />
                        <DateInput
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="종료일"
                        />
                    </>
                )}
                {sortOptions && sortOptions.length > 0 && (
                    <>
                        <SearchSelect
                            value={sortField}
                            onChange={(e) =>
                                handleSortFieldChange(e.target.value)
                            }
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </SearchSelect>
                        <SearchSelect
                            value={sortOrder}
                            onChange={(e) =>
                                handleSortOrderChange(e.target.value)
                            }
                        >
                            <option value="DESC">내림차순</option>
                            <option value="ASC">오름차순</option>
                        </SearchSelect>
                    </>
                )}
                <SearchButton onClick={handleSearch}>검색</SearchButton>
                <ResetButton onClick={handleReset}>초기화</ResetButton>
            </SearchContainer>
        </>
    );
};

export default SearchBar;

const OwnerTypeFilterContainer = styled.div`
    display: flex;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    margin-bottom: 0.5rem;
    align-items: center;

    @media (max-width: 768px) {
        gap: 1rem;
        justify-content: center;
    }
`;

const OwnerTypeLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    user-select: none;

    span {
        transition: color 0.15s ease;
    }

    &:hover span {
        color: #1f2937;
    }
`;

const OwnerTypeInput = styled.input`
    width: 1rem;
    height: 1rem;
    cursor: pointer;
    accent-color: #3b82f6;
`;

const SearchContainer = styled.div`
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    background-color: #ffffff;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    margin-bottom: 1rem;

    @media (max-width: 768px) {
        flex-wrap: wrap;
    }
`;

const SearchSelect = styled.select`
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background-color: white;
    cursor: pointer;
    width: auto;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 12px;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    @media (max-width: 768px) {
        width: 100%;
        order: 1;
    }
`;

const SearchInput = styled.input`
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: #9ca3af;
    }

    @media (max-width: 768px) {
        width: 100%;
        flex-basis: 100%;
        order: 2;
    }
`;

const DateInput = styled.input`
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    width: auto;
    min-width: 150px;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    @media (max-width: 768px) {
        width: 100%;
    }
`;

const SearchButton = styled.button`
    padding: 0.5rem 1.5rem;
    background-color: #374151;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
    white-space: nowrap;

    &:hover {
        background-color: #1f2937;
    }

    @media (max-width: 768px) {
        flex: 1;
        order: 3;
    }
`;

const ResetButton = styled.button`
    padding: 0.5rem 1rem;
    background-color: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
        background-color: #f9fafb;
        border-color: #9ca3af;
    }

    @media (max-width: 768px) {
        flex: 1;
        order: 4;
    }
`;
