"use client";

import styled from "@emotion/styled";

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
    employee?: {
        employeeNumber: number;
        name: string;
        affiliationName: string;
    } | null;
    vehicle: {
        id: number;
        number: string;
        name: string;
    };
}

interface RecordCardProps {
    record: VehicleRecord;
    index: number;
    onEditClick?: (record: VehicleRecord) => void;
    onDeleteClick?: (recordId: number) => void;
    currentUserEmployeeNumber?: string;
}

const RecordCard = ({
    record,
    index,
    onEditClick,
    onDeleteClick,
    currentUserEmployeeNumber,
}: RecordCardProps) => {
    // 본인이 작성한 경우 또는 employee가 없는 경우 수정 가능
    const isOwnRecord =
        currentUserEmployeeNumber &&
        record.employee &&
        String(currentUserEmployeeNumber) === String(record.employee.employeeNumber);
    const hasNoEmployee = !record.employee;
    const canEdit = isOwnRecord || hasNoEmployee;
    return (
        <Card hasNoEmployee={hasNoEmployee}>
            <CardHeader hasNoEmployee={hasNoEmployee}>
                <HeaderLeft>
                    <CardTitle>No. {index + 1}</CardTitle>
                    <DateBadge>{record.useDate}</DateBadge>
                </HeaderLeft>
            </CardHeader>

            <CardBody>
                <Section>
                    <InfoRow>
                        <InfoLabel>작성일</InfoLabel>
                        <InfoValue>
                            {record.createdDate
                                ? `${record.createdDate.split("T")[0]} ${record.createdDate.split("T")[1]?.split(":").slice(0, 2).join(":")}`
                                : "-"}
                        </InfoValue>
                    </InfoRow>
                </Section>

                <Divider />

                <Section>
                    <SectionTitle>사용자</SectionTitle>
                    <InfoRow>
                        <InfoLabel>부서</InfoLabel>
                        <InfoValue>
                            {record.employee?.affiliationName || "-"}
                        </InfoValue>
                    </InfoRow>
                    <InfoRow>
                        <InfoLabel>성명</InfoLabel>
                        <InfoValue>{record.employee?.name || "-"}</InfoValue>
                    </InfoRow>
                </Section>

                <Divider />

                <Section>
                    <SectionTitle>운행내역</SectionTitle>
                    <InfoRow>
                        <InfoLabel>주행 전</InfoLabel>
                        <InfoValue>
                            {(record.beforeDistance ?? 0).toLocaleString()} km
                        </InfoValue>
                    </InfoRow>
                    <InfoRow>
                        <InfoLabel>주행 후</InfoLabel>
                        <InfoValue>
                            {(record.currentDistance ?? 0).toLocaleString()} km
                        </InfoValue>
                    </InfoRow>
                    <InfoRow>
                        <InfoLabel>주행거리</InfoLabel>
                        <InfoValue>
                            {(record.totalDistance ?? 0).toLocaleString()} km
                        </InfoValue>
                    </InfoRow>
                    <InfoRow>
                        <InfoLabel>출/퇴근용</InfoLabel>
                        <InfoValue>
                            {(record.commuteDistance ?? 0).toLocaleString()} km
                        </InfoValue>
                    </InfoRow>
                    <InfoRow>
                        <InfoLabel>일반 업무용</InfoLabel>
                        <InfoValue>
                            {(record.businessDistance ?? 0).toLocaleString()} km
                        </InfoValue>
                    </InfoRow>
                </Section>

                {record.content && (
                    <>
                        <Divider />
                        <Section>
                            <SectionTitle>비고</SectionTitle>
                            <NoteText>{record.content}</NoteText>
                        </Section>
                    </>
                )}
            </CardBody>

            {canEdit && (
                <CardFooter>
                    <EditButton onClick={() => onEditClick?.(record)}>
                        수정
                    </EditButton>
                    <DeleteButton onClick={() => onDeleteClick?.(record.id)}>
                        삭제
                    </DeleteButton>
                </CardFooter>
            )}
        </Card>
    );
};

export default RecordCard;

// Styled Components
const Card = styled.div<{ hasNoEmployee?: boolean }>`
    background: ${(props) => (props.hasNoEmployee ? "#fee2e2" : "white")};
    border-radius: 0.75rem;
    box-shadow:
        0 1px 3px 0 rgba(0, 0, 0, 0.1),
        0 1px 2px 0 rgba(0, 0, 0, 0.06);
    overflow: hidden;
`;

const CardHeader = styled.div<{ hasNoEmployee?: boolean }>`
    padding: 1rem 1.25rem;
    background-color: ${(props) =>
        props.hasNoEmployee ? "#fecaca" : "#f9fafb"};
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const CardTitle = styled.h3`
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
`;

const DateBadge = styled.span`
    display: inline-block;
    padding: 0.25rem 0.625rem;
    background-color: #e0f2fe;
    color: #0369a1;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
`;

const CardBody = styled.div`
    padding: 1.25rem;
`;

const Section = styled.div`
    margin-bottom: 1rem;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionTitle = styled.h4`
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.75rem 0;
`;

const InfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;

    &:last-child {
        border-bottom: none;
    }
`;

const InfoLabel = styled.span`
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
`;

const InfoValue = styled.span`
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 600;
`;

const Divider = styled.div`
    height: 1px;
    background-color: #e5e7eb;
    margin: 1rem 0;
`;

const NoteText = styled.p`
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
`;

const CardFooter = styled.div`
    padding: 1rem 1.25rem;
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
`;

const EditButton = styled.button`
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background-color: #f9fafb;
    }
`;

const DeleteButton = styled.button`
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #ef4444;
    background-color: white;
    border: 1px solid #ef4444;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background-color: #fef2f2;
    }
`;
