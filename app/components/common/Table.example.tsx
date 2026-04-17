// Table 컴포넌트 사용 예시

import {
    Table,
    THead,
    TBody,
    THeadRow,
    TRow,
    TH,
    TD,
    TableWrapper,
    EmptyState,
    TableCaption,
} from "./Table";

// 예시 1: 기본 사용법
export function BasicTableExample() {
    return (
        <TableWrapper>
            <Table>
                <THead>
                    <THeadRow>
                        <TH>이름</TH>
                        <TH>이메일</TH>
                        <TH>역할</TH>
                    </THeadRow>
                </THead>
                <TBody>
                    <TRow>
                        <TD>홍길동</TD>
                        <TD>hong@example.com</TD>
                        <TD>개발자</TD>
                    </TRow>
                    <TRow>
                        <TD>김철수</TD>
                        <TD>kim@example.com</TD>
                        <TD>디자이너</TD>
                    </TRow>
                    <TRow>
                        <TD>이영희</TD>
                        <TD>lee@example.com</TD>
                        <TD>기획자</TD>
                    </TRow>
                </TBody>
            </Table>
        </TableWrapper>
    );
}

// 예시 2: 차량 목록 테이블
export function CarTableExample() {
    const cars = [
        {
            id: 1,
            carNumber: "12가3456",
            model: "그랜저",
            fuelType: "휘발유",
            registrationDate: "2024-01-15",
        },
        {
            id: 2,
            carNumber: "34나5678",
            model: "소나타",
            fuelType: "경유",
            registrationDate: "2024-02-20",
        },
        {
            id: 3,
            carNumber: "56다7890",
            model: "아이오닉",
            fuelType: "전기",
            registrationDate: "2024-03-10",
        },
    ];

    return (
        <TableWrapper>
            <Table>
                <TableCaption>차량 관리</TableCaption>
                <THead>
                    <THeadRow>
                        <TH>차량 번호</TH>
                        <TH>모델</TH>
                        <TH>연료 유형</TH>
                        <TH>등록일</TH>
                        <TH>작업</TH>
                    </THeadRow>
                </THead>
                <TBody>
                    {cars.map((car) => (
                        <TRow key={car.id}>
                            <TD>{car.carNumber}</TD>
                            <TD>{car.model}</TD>
                            <TD>{car.fuelType}</TD>
                            <TD>{car.registrationDate}</TD>
                            <TD>
                                <button>수정</button>
                                <button>삭제</button>
                            </TD>
                        </TRow>
                    ))}
                </TBody>
            </Table>
        </TableWrapper>
    );
}

// 예시 3: 빈 상태
export function EmptyTableExample() {
    return (
        <TableWrapper>
            <Table>
                <THead>
                    <THeadRow>
                        <TH>차량 번호</TH>
                        <TH>모델</TH>
                        <TH>연료 유형</TH>
                    </THeadRow>
                </THead>
                <TBody>
                    <TRow>
                        <TD colSpan={3}>
                            <EmptyState>등록된 차량이 없습니다.</EmptyState>
                        </TD>
                    </TRow>
                </TBody>
            </Table>
        </TableWrapper>
    );
}

// 예시 4: 커스텀 스타일 적용
export function CustomStyledTableExample() {
    return (
        <TableWrapper>
            <Table>
                <THead>
                    <THeadRow>
                        <TH>상태</TH>
                        <TH>이름</TH>
                        <TH>진행률</TH>
                    </THeadRow>
                </THead>
                <TBody>
                    <TRow>
                        <TD>
                            <span style={{ color: "#10b981", fontWeight: 600 }}>
                                완료
                            </span>
                        </TD>
                        <TD>프로젝트 A</TD>
                        <TD>
                            <div
                                style={{
                                    width: "100%",
                                    height: "8px",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        backgroundColor: "#10b981",
                                    }}
                                />
                            </div>
                        </TD>
                    </TRow>
                    <TRow>
                        <TD>
                            <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                                진행중
                            </span>
                        </TD>
                        <TD>프로젝트 B</TD>
                        <TD>
                            <div
                                style={{
                                    width: "100%",
                                    height: "8px",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: "65%",
                                        height: "100%",
                                        backgroundColor: "#f59e0b",
                                    }}
                                />
                            </div>
                        </TD>
                    </TRow>
                </TBody>
            </Table>
        </TableWrapper>
    );
}
