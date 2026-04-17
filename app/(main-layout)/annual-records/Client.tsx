"use client";

import styled from "@emotion/styled";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCarStore } from "@/lib/stores/carStore";
import SearchBar from "@/components/common/SearchBar";
import AdvancedPagination from "@/components/common/AdvancedPagination";
import {
    Table,
    THead,
    TBody,
    THeadRow,
    TRow,
    TH,
    TD,
    TableWrapper,
} from "@/components/common/Table";

interface VehicleRecord {
    id: number;
    isInspection: boolean;
    vehicleStatus: string | null;
    totalDistance: number | null;
    beforeDistance: number | null;
    currentDistance: number | null;
    commuteDistance: number | null;
    businessDistance: number | null;
    content: string | null;
    useDate: string;
    createdDate: string;
    employee: {
        id: number;
        name: string;
        affiliationName: string;
    } | null;
    vehicle: {
        id: number;
        number: string;
        name: string;
    };
}

interface ClientProps {
    records: VehicleRecord[];
    year: string;
    selectedVehicleId?: string;
}

const Client = ({
    records,
    year,
    selectedVehicleId: initialVehicleId,
}: ClientProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { cars } = useCarStore();

    // 차량 필터 상태 - URL에서 받은 값으로 초기화
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
        initialVehicleId || "all",
    );

    // 검색 상태
    const [searchType, setSearchType] = useState("employee.name");
    const [searchKeyword, setSearchKeyword] = useState("");

    // 페이징 - URL query에서 가져오기 (0-based)
    const currentPage = Number(searchParams.get("page")) || 0;
    const itemsPerPage = Number(searchParams.get("size")) || 20;

    // 연도 변경 핸들러 - 선택된 차량 유지
    const handlePreviousYear = () => {
        const prevYear = String(Number(year) - 1);
        const url =
            selectedVehicleId !== "all"
                ? `/annual-records/${prevYear}/${selectedVehicleId}`
                : `/annual-records/${prevYear}`;
        router.push(url);
    };

    const handleNextYear = () => {
        const nextYear = String(Number(year) + 1);
        const url =
            selectedVehicleId !== "all"
                ? `/annual-records/${nextYear}/${selectedVehicleId}`
                : `/annual-records/${nextYear}`;
        router.push(url);
    };

    // 차량 선택 핸들러 - URL 업데이트
    const handleVehicleChange = (vehicleId: string) => {
        setSelectedVehicleId(vehicleId);
        const url =
            vehicleId !== "all"
                ? `/annual-records/${year}/${vehicleId}`
                : `/annual-records/${year}`;
        router.push(url);
    };

    // 검색 옵션
    const searchOptions = [
        { value: "employee.name", label: "사용자" },
        { value: "employee.deptName", label: "부서" },
        { value: "vehicle.number", label: "차량번호" },
        { value: "useDate", label: "사용일자" },
    ];

    // 검색 핸들러
    const handleSearch = (type: string, keyword: string) => {
        setSearchType(type);
        setSearchKeyword(keyword);
        // 검색 시 0페이지로 이동
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "0");
        router.push(`${window.location.pathname}?${params.toString()}`);
    };

    // 검색 필터링 (차량 필터링은 서버에서 처리)
    const filteredRecords = useMemo(() => {
        if (!searchKeyword) return records;
        return records.filter((record) => {
            let value: string | undefined;

            if (searchType === "employee.name") {
                value = record.employee?.name;
            } else if (searchType === "employee.deptName") {
                value = record.employee?.affiliationName;
            } else if (searchType === "vehicle.number") {
                value = record.vehicle.number;
            } else if (searchType === "useDate") {
                value = record.useDate;
            } else {
                value = record[searchType as keyof VehicleRecord] as string;
            }

            if (typeof value === "string") {
                return value
                    .toLowerCase()
                    .includes(searchKeyword.toLowerCase());
            }
            return false;
        });
    }, [records, searchType, searchKeyword]);

    // 페이징 (0-based)
    const paginatedRecords = useMemo(() => {
        const startIndex = currentPage * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredRecords.slice(startIndex, endIndex);
    }, [filteredRecords, currentPage, itemsPerPage]);

    // Excel 다운로드 핸들러
    const handleExcelDownload = async () => {
        const { Workbook } = await import("exceljs");
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet("운행기록");

        // 선택된 차량 정보 가져오기
        const selectedVehicle = cars.find(
            (car) => String(car.id) === selectedVehicleId,
        );

        // 제목 (A1:L1 병합)
        worksheet.mergeCells("A1:L1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "업무용승용차 운행기록부";
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { vertical: "middle", horizontal: "center" };

        // 빈 행
        worksheet.addRow([]);

        // 헤더 영역 시작 (3행부터)
        // 사업연도 (A3:C3 병합)
        worksheet.mergeCells("A3:C3");
        const yearLabelCell = worksheet.getCell("A3");
        yearLabelCell.value = "사업연도";
        yearLabelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        yearLabelCell.alignment = { vertical: "middle", horizontal: "center" };
        yearLabelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 사업연도 값 (D3:F3 병합)
        worksheet.mergeCells("D3:F3");
        const yearValueCell = worksheet.getCell("D3");
        yearValueCell.value = `${year}-01-01\n~\n${year}-12-31`;
        yearValueCell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        yearValueCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 법인명 (G3:I3 병합)
        worksheet.mergeCells("G3:I3");
        const companyLabelCell = worksheet.getCell("G3");
        companyLabelCell.value = "법인명";
        companyLabelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        companyLabelCell.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        companyLabelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 법인명 값 (J3:L3 병합)
        worksheet.mergeCells("J3:L3");
        const companyValueCell = worksheet.getCell("J3");
        companyValueCell.value = "우성토트로콘(주)";
        companyValueCell.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        companyValueCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 사업자등록번호 라벨 (G4:I4 병합)
        worksheet.mergeCells("G4:I4");
        const bizNumLabelCell = worksheet.getCell("G4");
        bizNumLabelCell.value = "사업자등록번호";
        bizNumLabelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        bizNumLabelCell.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        bizNumLabelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 사업자등록번호 값 (J4:L4 병합)
        worksheet.mergeCells("J4:L4");
        const bizNumValueCell = worksheet.getCell("J4");
        bizNumValueCell.value = "133-81-32631";
        bizNumValueCell.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        bizNumValueCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 빈 행
        worksheet.addRow([]);

        // 기본정보 제목 (6행)
        worksheet.mergeCells("A6:L6");
        const infoTitleCell = worksheet.getCell("A6");
        infoTitleCell.value = "1. 기본정보";
        infoTitleCell.font = { bold: true };
        infoTitleCell.alignment = { vertical: "middle", horizontal: "left" };

        // 차량 정보 헤더 (7행)
        worksheet.mergeCells("A7:C7");
        const carNumLabelCell = worksheet.getCell("A7");
        carNumLabelCell.value = "①차 종";
        carNumLabelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        carNumLabelCell.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        carNumLabelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("D7:F7");
        const carRegNumLabelCell = worksheet.getCell("D7");
        carRegNumLabelCell.value = "②자동차등록번호";
        carRegNumLabelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        carRegNumLabelCell.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        carRegNumLabelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 차량 정보 값 (8행)
        worksheet.mergeCells("A8:C8");
        const carNameCell = worksheet.getCell("A8");
        carNameCell.value = selectedVehicle?.name || "";
        carNameCell.alignment = { vertical: "middle", horizontal: "center" };
        carNameCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("D8:F8");
        const carNumberCell = worksheet.getCell("D8");
        carNumberCell.value = selectedVehicle?.number || "";
        carNumberCell.alignment = { vertical: "middle", horizontal: "center" };
        carNumberCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 빈 행
        worksheet.addRow([]);

        // 업무용 사용비율 계산 제목 (10행)
        worksheet.mergeCells("A10:L10");
        const usageTitleCell = worksheet.getCell("A10");
        usageTitleCell.value = "2. 업무용 사용비율 계산";
        usageTitleCell.font = { bold: true };
        usageTitleCell.alignment = { vertical: "middle", horizontal: "left" };

        // 테이블 헤더 (11-13행, 복잡한 병합 구조)
        // 11행: 대분류 헤더
        worksheet.mergeCells("A11:A13");
        const headerNo = worksheet.getCell("A11");
        headerNo.value = "①사용\n일자\n(운일)";
        headerNo.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerNo.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        headerNo.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("B11:C11");
        const headerUser = worksheet.getCell("B11");
        headerUser.value = "③사용자";
        headerUser.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerUser.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerUser.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("D11:H11");
        const headerDriving = worksheet.getCell("D11");
        headerDriving.value = "운행내역";
        headerDriving.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerDriving.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerDriving.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("I11:I13");
        const headerNote = worksheet.getCell("I11");
        headerNote.value = "⑦비 고";
        headerNote.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerNote.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerNote.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 12행: 중분류 헤더
        worksheet.mergeCells("B12:B13");
        const headerDept = worksheet.getCell("B12");
        headerDept.value = "부서";
        headerDept.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerDept.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerDept.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("C12:C13");
        const headerName = worksheet.getCell("C12");
        headerName.value = "성명";
        headerName.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerName.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerName.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("D12:D13");
        const headerBefore = worksheet.getCell("D12");
        headerBefore.value = "⑤주행 전\n계기판의 거리㎞";
        headerBefore.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerBefore.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        headerBefore.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("E12:E13");
        const headerAfter = worksheet.getCell("E12");
        headerAfter.value = "⑥주행 후\n계기판의 거리㎞";
        headerAfter.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerAfter.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        headerAfter.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("F12:F13");
        const headerTotal = worksheet.getCell("F12");
        headerTotal.value = "⑦주행거리㎞";
        headerTotal.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerTotal.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        headerTotal.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        worksheet.mergeCells("G12:H12");
        const headerBusiness = worksheet.getCell("G12");
        headerBusiness.value = "업무용 사용거리㎞";
        headerBusiness.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerBusiness.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerBusiness.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 13행: 소분류 헤더
        const headerCommute = worksheet.getCell("G13");
        headerCommute.value = "⑧출・퇴근용㎞";
        headerCommute.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerCommute.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerCommute.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        const headerGeneralBusiness = worksheet.getCell("H13");
        headerGeneralBusiness.value = "⑨일반 업무용㎞";
        headerGeneralBusiness.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };
        headerGeneralBusiness.alignment = {
            vertical: "middle",
            horizontal: "center",
        };
        headerGeneralBusiness.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };

        // 컬럼 너비 설정
        worksheet.getColumn(1).width = 12; // 사용일자
        worksheet.getColumn(2).width = 20; // 부서
        worksheet.getColumn(3).width = 10; // 성명
        worksheet.getColumn(4).width = 12; // 주행 전
        worksheet.getColumn(5).width = 12; // 주행 후
        worksheet.getColumn(6).width = 12; // 주행거리
        worksheet.getColumn(7).width = 12; // 출퇴근용
        worksheet.getColumn(8).width = 12; // 일반업무용
        worksheet.getColumn(9).width = 30; // 비고

        // 행 높이 설정
        worksheet.getRow(3).height = 40;
        worksheet.getRow(7).height = 20;
        worksheet.getRow(11).height = 20;
        worksheet.getRow(12).height = 20;
        worksheet.getRow(13).height = 20;

        // 데이터 추가 (14행부터)
        filteredRecords.forEach((record) => {
            const row = worksheet.addRow([
                record.useDate,
                record.employee?.affiliationName || "-",
                record.employee?.name || "-",
                record.beforeDistance ?? 0,
                record.currentDistance ?? 0,
                record.totalDistance ?? 0,
                record.commuteDistance ?? 0,
                record.businessDistance ?? 0,
                record.content || "",
            ]);

            // 데이터 행 스타일
            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" },
                };
            });
        });

        // 파일 다운로드
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const vehicleName = selectedVehicle?.number || "전체";
        link.download = `업무용승용차_운행기록부_${year}년_${vehicleName}.xlsx`;
        link.click();
    };

    return (
        <Container>
            <Header>
                <Title>연도별 운행 기록 조회</Title>
                <HeaderRight>
                    <YearNavigation>
                        <YearButton onClick={handlePreviousYear}>
                            <ArrowIcon>←</ArrowIcon>
                        </YearButton>
                        <YearDisplay>{year}년</YearDisplay>
                        <YearButton onClick={handleNextYear}>
                            <ArrowIcon>→</ArrowIcon>
                        </YearButton>
                    </YearNavigation>
                    <ExcelButton onClick={handleExcelDownload}>
                        Excel 다운로드
                    </ExcelButton>
                </HeaderRight>
            </Header>

            <FilterBox>
                <VehicleFilterGroup>
                    <FilterLabel>차량:</FilterLabel>
                    <VehicleSelect
                        value={selectedVehicleId}
                        onChange={(e) => handleVehicleChange(e.target.value)}
                    >
                        <option value="all">전체 차량</option>
                        {cars.map((car) => (
                            <option key={car.id} value={car.id}>
                                {car.number} - {car.name}
                            </option>
                        ))}
                    </VehicleSelect>
                </VehicleFilterGroup>

                <SearchWrapper>
                    <SearchBar
                        searchOptions={searchOptions}
                        onSearch={handleSearch}
                        placeholder="검색어를 입력하세요"
                    />
                </SearchWrapper>
            </FilterBox>

            <ContentBox>
                <TableWrapper>
                    <BorderedTable>
                        <THead>
                            <THeadRow>
                                <BorderedTH rowSpan={2}>No.</BorderedTH>
                                <BorderedTH rowSpan={2}>차량번호</BorderedTH>
                                <BorderedTH rowSpan={2}>차량명</BorderedTH>
                                <BorderedTH rowSpan={2}>사용일자</BorderedTH>
                                <BorderedTH rowSpan={2}>작성일</BorderedTH>
                                <BorderedTH colSpan={2}>사용자</BorderedTH>
                                <BorderedTH colSpan={5}>운행내역</BorderedTH>
                                <BorderedTH
                                    rowSpan={2}
                                    style={{ width: "300px" }}
                                >
                                    비고
                                </BorderedTH>
                            </THeadRow>
                            <THeadRow>
                                <BorderedTH>부서</BorderedTH>
                                <BorderedTH>성명</BorderedTH>
                                <BorderedTH>주행 전(km)</BorderedTH>
                                <BorderedTH>주행 후(km)</BorderedTH>
                                <BorderedTH>주행거리(km)</BorderedTH>
                                <BorderedTH>출/퇴근용(km)</BorderedTH>
                                <BorderedTH>일반 업무용(km)</BorderedTH>
                            </THeadRow>
                        </THead>
                        <TBody>
                            {paginatedRecords.length > 0 ? (
                                paginatedRecords.map((record, index) => (
                                    <TRow key={record.id}>
                                        <BorderedTD>
                                            {currentPage * itemsPerPage +
                                                index +
                                                1}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.vehicle.number}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.vehicle.name}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.useDate}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.createdDate}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.employee?.affiliationName ||
                                                "-"}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.employee?.name || "-"}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {(
                                                record.beforeDistance ?? 0
                                            ).toLocaleString()}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {(
                                                record.currentDistance ?? 0
                                            ).toLocaleString()}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {(
                                                record.totalDistance ?? 0
                                            ).toLocaleString()}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {(
                                                record.commuteDistance ?? 0
                                            ).toLocaleString()}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {(
                                                record.businessDistance ?? 0
                                            ).toLocaleString()}
                                        </BorderedTD>
                                        <BorderedTD>
                                            {record.content || "-"}
                                        </BorderedTD>
                                    </TRow>
                                ))
                            ) : (
                                <TRow>
                                    <BorderedTD colSpan={12}>
                                        운행 기록이 없습니다
                                    </BorderedTD>
                                </TRow>
                            )}
                        </TBody>
                    </BorderedTable>
                </TableWrapper>

                <AdvancedPagination
                    totalItems={filteredRecords.length}
                    defaultPageSize={20}
                    pageSizeOptions={[10, 20, 50, 100, 0]}
                />
            </ContentBox>
        </Container>
    );
};

export default Client;

// Styled Components
const Container = styled.div`
    padding: 1.5rem;
    width: 100%;
    min-height: 100vh;
    background-color: #f9fafb;

    @media (max-width: 1023px) {
        padding-bottom: calc(100px + env(safe-area-inset-bottom)); /* NavBar 높이(65px) + 여유 공간 + Safari 하단 여백 */
    }
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
`;

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
`;

const HeaderRight = styled.div`
    display: flex;
    gap: 1rem;
    align-items: center;
`;

const YearNavigation = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.25rem;
`;

const YearButton = styled.button`
    padding: 0.375rem 0.75rem;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background-color: #f3f4f6;
    }

    &:active {
        background-color: #e5e7eb;
    }
`;

const ArrowIcon = styled.span`
    font-size: 1.25rem;
    color: #374151;
    user-select: none;
`;

const YearDisplay = styled.div`
    padding: 0 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    min-width: 80px;
    text-align: center;
`;

const ExcelButton = styled.button`
    padding: 0.625rem 1.25rem;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        background-color: #059669;
    }

    &:active {
        background-color: #047857;
    }
`;

const FilterBox = styled.div`
    background-color: white;
    border-radius: 0.5rem;
    padding: 1.25rem;
    margin-bottom: 1rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    display: flex;
    gap: 1.5rem;
    align-items: center;
    flex-wrap: wrap;
`;

const VehicleFilterGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const FilterLabel = styled.label`
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    white-space: nowrap;
`;

const VehicleSelect = styled.select`
    padding: 0.625rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    background-color: white;
    min-width: 200px;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
`;

const SearchWrapper = styled.div`
    flex: 1;
    min-width: 300px;

    /* SearchBar의 기본 스타일 오버라이드 */
    > div {
        padding: 0;
        margin: 0;
        border: none;
        background-color: transparent;
    }
`;

const ContentBox = styled.div`
    background-color: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

const BorderedTable = styled(Table)`
    border-collapse: collapse;

    th,
    td {
        border: 1px solid #d1d5db;
    }
`;

const BorderedTH = styled(TH)`
    border: 1px solid #d1d5db;
`;

const BorderedTD = styled(TD)`
    border: 1px solid #d1d5db;
`;
