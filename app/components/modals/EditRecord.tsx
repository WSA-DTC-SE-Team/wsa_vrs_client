"use client";

import { useModalStore } from "@/lib/stores/modalStore";
import styled from "@emotion/styled";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";
import {
    ModalContentContainer,
    ModalHeader,
    ModalFooter,
} from "./styles/modalStyling";
import axiosInstance from "@/lib/axios";
import { useCarStore } from "@/lib/stores/carStore";
import useUserStore from "@/lib/stores/userStore";
import useAlertStore from "@/lib/stores/alertStore";
import {
    revalidateVehicleRecords,
    revalidateVehicle,
} from "@/lib/actions/revalidate";
import { AxiosError } from "axios";

const EditRecord = () => {
    const { closeModal, modal, triggerRefresh } = useModalStore();
    const { cars, fetchCars } = useCarStore();
    const { user } = useUserStore();
    const { setAlert } = useAlertStore();
    const router = useRouter();

    // modal에서 recordData 가져오기
    const recordData = modal?.recordData;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [recordState, setRecordState] = useState({
        id: recordData?.id || 0,
        isInspection: recordData?.isInspection || false,
        totalDistance: recordData?.totalDistance || 0,
        beforeDistance: recordData?.beforeDistance || 0,
        currentDistance: recordData?.currentDistance || 0,
        commuteDistance: recordData?.commuteDistance || 0,
        businessDistance: recordData?.businessDistance || 0,
        content: recordData?.content || "",
        useDate: recordData?.useDate || "",
        vehicle: {
            id: recordData?.vehicle?.id || 0,
        },
        employee: {
            employeeNumber: recordData?.employee?.employeeNumber || "",
        },
    });

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean = value;

        if (type === "checkbox") {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === "number") {
            finalValue = value === "" ? 0 : Number(value);
        }

        setRecordState((prev) => {
            const newState = { ...prev, [name]: finalValue };

            // 1. [계기판 거리 수정] -> Total을 결정하고, 일단 모두 Business에 할당
            if (name === "beforeDistance" || name === "currentDistance") {
                const before = Number(newState.beforeDistance) || 0;
                const after = Number(newState.currentDistance) || 0;
                const calculatedTotal = Math.max(0, after - before);

                newState.totalDistance = calculatedTotal;
                newState.businessDistance = calculatedTotal; // 초기값은 전체 업무용으로
                newState.commuteDistance = 0; // 출퇴근은 0으로 초기화
            }

            // 2. [업무용 거리 수정] -> (Total - 업무용) 만큼 출퇴근 거리 자동 계산
            else if (name === "businessDistance") {
                const total = Number(prev.totalDistance) || 0;
                const biz = Number(finalValue) || 0;

                // 업무용이 전체를 넘지 않도록 처리하며 나머지를 출퇴근에 배분
                newState.commuteDistance = Math.max(0, total - biz);
            }

            // 3. [출퇴근 거리 수정] -> (Total - 출퇴근) 만큼 업무용 거리 자동 계산
            else if (name === "commuteDistance") {
                const total = Number(prev.totalDistance) || 0;
                const com = Number(finalValue) || 0;

                // 출퇴근이 전체를 넘지 않도록 처리하며 나머지를 업무용에 배분
                newState.businessDistance = Math.max(0, total - com);
            }

            // 4. [차량 선택 시] -> 모든 거리 초기화
            else if (name === "vehicleId") {
                const selectedCarId = Number(value);
                const selectedCar = cars.find(
                    (car) => car.id === selectedCarId,
                );
                const initialDistance = selectedCar?.distance || 0;

                newState.vehicle = { id: selectedCarId };
                newState.beforeDistance = initialDistance;
                newState.currentDistance = initialDistance;
                newState.totalDistance = 0;
                newState.businessDistance = 0;
                newState.commuteDistance = 0;
            }

            return newState;
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        // currentDistance 검증
        if (recordState.currentDistance <= 0) {
            setAlert("error", "현재 주행거리는 0보다 커야 합니다.");
            return;
        }

        if (
            recordState.totalDistance !==
            recordState.businessDistance + recordState.commuteDistance
        ) {
            setAlert("error", "주행 거리가 주행 내역과 일치하지 않습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.patch(
                `/vrs/vehicle-records/update`,
                recordState,
            );
            setAlert("success", "저장 되었습니다.");

            // 클라이언트 상태 갱신만
            await fetchCars();
            triggerRefresh();

            closeModal();
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            setAlert(
                "error",
                axiosError.response?.data?.detail || "수정에 실패했습니다.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!recordState.id) return;

        setAlert("confirm", "운행 내역을 삭제하시겠습니까?", async () => {
            try {
                await axiosInstance.delete(
                    `/vrs/vehicle-records/erase/${recordState.id}`,
                );
                setAlert("success", "운행 내역이 삭제되었습니다.");
                await fetchCars();
                triggerRefresh();
                closeModal();
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string }>;

                setAlert(
                    "error",
                    axiosError.response?.data?.detail || "삭제에 실패했습니다.",
                );
            }
        });
    };

    return (
        <ModalContentContainer onSubmit={handleSubmit}>
            <ModalHeader>
                <Title>운행 내역 수정</Title>
                <CloseButton onClick={closeModal}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
                <FormGrid>
                    <FormGroup>
                        <Label>사용일자</Label>
                        <Input
                            type="date"
                            name="useDate"
                            value={recordState.useDate}
                            onChange={handleChange}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>차량</Label>
                        <Input
                            type="text"
                            value={
                                cars.find(
                                    (car) => car.id === recordState.vehicle.id,
                                )?.number || ""
                            }
                            readOnly
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>주행 전(km)</Label>
                        <Input
                            type="number"
                            name="beforeDistance"
                            value={recordState.beforeDistance}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>주행 후(km)</Label>
                        <Input
                            type="number"
                            name="currentDistance"
                            value={recordState.currentDistance}
                            onChange={handleChange}
                            placeholder="0"
                            min="1"
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>총 주행거리(km)</Label>
                        <Input
                            type="number"
                            name="totalDistance"
                            value={recordState.totalDistance}
                            onChange={handleChange}
                            placeholder="자동 계산됨"
                            readOnly
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>출/퇴근용(km)</Label>
                        <Input
                            type="number"
                            name="commuteDistance"
                            value={recordState.commuteDistance}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>일반 업무용(km)</Label>
                        <Input
                            type="number"
                            name="businessDistance"
                            value={recordState.businessDistance}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormGroup>
                    <FormGroupFull>
                        <Label>비고</Label>
                        <TextArea
                            name="content"
                            value={recordState.content}
                            onChange={handleChange}
                            placeholder="비고 사항을 입력하세요"
                            rows={3}
                        />
                    </FormGroupFull>
                </FormGrid>
            </ModalBody>
            <ModalFooter>
                <DeleteButton
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                >
                    삭제
                </DeleteButton>
                <CancelButton
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                >
                    취소
                </CancelButton>
                <SubmitButton type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "수정 중..." : "수정"}
                </SubmitButton>
            </ModalFooter>
        </ModalContentContainer>
    );
};

export default EditRecord;

const Title = styled.h2`
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: 2rem;
    color: #9ca3af;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        color: #374151;
    }
`;

const ModalBody = styled.div`
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(80vh - 120px);

    @media (max-width: 768px) {
        max-height: calc(100vh - 200px);
    }
`;

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const FormGroupFull = styled(FormGroup)`
    grid-column: 1 / -1;
`;

const CheckboxGroup = styled.div`
    grid-column: 1 / -1;
    display: flex;
    gap: 1.5rem;
    padding: 0.5rem 0;
`;

const CheckboxWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const CheckboxLabel = styled.label`
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    user-select: none;
`;

const WarningMessage = styled.div`
    grid-column: 1 / -1;
    font-size: 0.75rem;
    color: #dc2626;
    margin-top: -0.5rem;
    padding-left: 0.25rem;
`;

const Label = styled.label`
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
`;

const Input = styled.input`
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &:read-only {
        background-color: #f9fafb;
        cursor: not-allowed;
    }

    &::placeholder {
        color: #9ca3af;
    }
`;

const TextArea = styled.textarea`
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.15s ease;
    resize: none;
    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: #9ca3af;
    }
`;

const DeleteButton = styled.button`
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.375rem;
    background: #dc2626;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
    margin-right: auto;

    &:hover:not(:disabled) {
        background-color: #b91c1c;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background-color: #fca5a5;
    }

    @media (max-width: 1023px) {
        width: 100%;
        margin-right: 0;
    }
`;

const CancelButton = styled.button`
    padding: 0.625rem 1.25rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #f9fafb;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SubmitButton = styled.button`
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.375rem;
    background: #3b82f6;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #2563eb;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background-color: #93c5fd;
    }
`;
