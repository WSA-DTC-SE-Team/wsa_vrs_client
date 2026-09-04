"use client";

import styled from "@emotion/styled";
import { useModalStore } from "@/lib/stores/modalStore";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
    ModalContentContainer,
    ModalHeader,
    ModalFooter,
} from "./styles/modalStyling";
import axiosInstance from "@/lib/axios";
import { useCarStore } from "@/lib/stores/carStore";
import useAlertStore from "@/lib/stores/alertStore";
import { AxiosError } from "axios";

// 관리항목 한 건 (specItems 배열의 원소)
interface SpecItem {
    specDescription: string;
    specQuantity: number;
}

const emptySpecItem = (): SpecItem => ({ specDescription: "", specQuantity: 1 });

const EditSpec = () => {
    const router = useRouter();
    const { setAlert } = useAlertStore();
    const { closeModal, modal, triggerRefresh } = useModalStore();
    const { fetchCars } = useCarStore();

    const specData = modal?.specData;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [specState, setSpecState] = useState({
        id: specData?.id ?? 0,
        specDate: specData?.specDate ?? "",
        specDistance: specData?.specDistance ?? "",
        content: specData?.content ?? "",
        specItems:
            specData?.specItems && specData.specItems.length > 0
                ? specData.specItems.map((item) => ({
                      specDescription: item.specDescription,
                      specQuantity: item.specQuantity,
                  }))
                : [emptySpecItem()],
        vehicle: { id: specData?.vehicle?.id ?? 0 },
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setSpecState((prev) => ({ ...prev, [name]: value }));
    };

    const addSpecItem = () => {
        setSpecState((prev) => ({
            ...prev,
            specItems: [...prev.specItems, emptySpecItem()],
        }));
    };

    const updateSpecItem = <K extends keyof SpecItem>(
        index: number,
        field: K,
        value: SpecItem[K],
    ) => {
        setSpecState((prev) => ({
            ...prev,
            specItems: prev.specItems.map((item, i) =>
                i === index ? { ...item, [field]: value } : item,
            ),
        }));
    };

    const removeSpecItem = (index: number) => {
        setSpecState((prev) => ({
            ...prev,
            specItems: prev.specItems.filter((_, i) => i !== index),
        }));
    };

    const items = specState.specItems;
    const totalQuantity = items.reduce(
        (sum, item) => sum + (Number(item.specQuantity) || 0),
        0,
    );

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (items.length === 0) {
            setAlert("error", "관리 항목을 하나 이상 추가해주세요.");
            return;
        }
        if (items.some((item) => !item.specDescription.trim())) {
            setAlert("error", "관리 항목 내용을 입력해주세요.");
            return;
        }

        const specItems: SpecItem[] = items.map((item) => ({
            specDescription: item.specDescription.trim(),
            specQuantity: Number(item.specQuantity) || 0,
        }));

        const payload = {
            id: specState.id,
            specDate: specState.specDate,
            specDistance: String(specState.specDistance || 0),
            content: specState.content,
            vehicle: { id: specState.vehicle.id },
            specItems,
        };

        setIsSubmitting(true);
        try {
            await axiosInstance.patch(
                "/vrs/vehicle-spec-histories/update",
                payload,
            );
            await fetchCars();
            triggerRefresh();
            setAlert("success", "관리 내역이 수정되었습니다.");
            closeModal();

            setTimeout(() => {
                router.replace(
                    window.location.pathname + window.location.search,
                );
            }, 100);
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            setAlert(
                "error",
                axiosError.response?.data?.detail ||
                    "관리 내역 수정에 실패했습니다.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!specState.id) return;
        setAlert("confirm", "관리 내역을 삭제하시겠습니까?", async () => {
            try {
                await axiosInstance.delete(
                    `/vrs/vehicle-spec-histories/erase/${specState.id}`,
                );
                await fetchCars();
                triggerRefresh();
                setAlert("success", "관리 내역이 삭제되었습니다.");
                closeModal();

                setTimeout(() => {
                    router.replace(
                        window.location.pathname + window.location.search,
                    );
                }, 100);
            } catch (error) {
                const axiosError = error as AxiosError<{ detail?: string }>;
                setAlert(
                    "error",
                    axiosError.response?.data?.detail ||
                        "삭제에 실패했습니다.",
                );
            }
        });
    };

    return (
        <ModalContentContainer onSubmit={handleSubmit}>
            <ModalHeader>
                <Title>관리 내역 수정</Title>
                <CloseButton type="button" onClick={closeModal}>
                    &times;
                </CloseButton>
            </ModalHeader>
            <ModalBody>
                <FormGrid>
                    <FormGroup>
                        <Label>시행일자</Label>
                        <Input
                            type="date"
                            name="specDate"
                            value={specState.specDate}
                            onChange={handleChange}
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>당시 주행거리(km)</Label>
                        <Input
                            type="number"
                            name="specDistance"
                            value={specState.specDistance}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormGroup>

                    <FormGroupFull>
                        <ItemHeaderRow>
                            <Label>관리 내역</Label>
                            <AddItemButton type="button" onClick={addSpecItem}>
                                + 항목 추가
                            </AddItemButton>
                        </ItemHeaderRow>

                        <ItemTableWrapper>
                            <ItemTable>
                                <thead>
                                    <tr>
                                        <th style={{ width: "58%" }}>내용</th>
                                        <th style={{ width: "24%" }}>수량</th>
                                        <th style={{ width: "18%" }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr>
                                            <EmptyCell colSpan={3}>
                                                &quot;+ 항목 추가&quot; 를 눌러
                                                관리 항목을 등록하세요
                                            </EmptyCell>
                                        </tr>
                                    ) : (
                                        items.map((item, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <CellInput
                                                        type="text"
                                                        value={
                                                            item.specDescription
                                                        }
                                                        placeholder="예: 엔진오일 교체"
                                                        onChange={(e) =>
                                                            updateSpecItem(
                                                                index,
                                                                "specDescription",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <CellInput
                                                        type="number"
                                                        min="0"
                                                        value={item.specQuantity}
                                                        onChange={(e) =>
                                                            updateSpecItem(
                                                                index,
                                                                "specQuantity",
                                                                e.target
                                                                    .value === ""
                                                                    ? 0
                                                                    : Number(
                                                                          e.target
                                                                              .value,
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <RemoveButton
                                                        type="button"
                                                        onClick={() =>
                                                            removeSpecItem(index)
                                                        }
                                                    >
                                                        삭제
                                                    </RemoveButton>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {items.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <th>합계</th>
                                            <th>{totalQuantity}</th>
                                            <th />
                                        </tr>
                                    </tfoot>
                                )}
                            </ItemTable>
                        </ItemTableWrapper>
                    </FormGroupFull>

                    <FormGroupFull>
                        <Label>비고</Label>
                        <TextArea
                            name="content"
                            value={specState.content}
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

export default EditSpec;

// Styled Components
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
    flex: 1;
    max-height: calc(80vh - 150px);

    @media (max-width: 768px) {
        max-height: calc(100vh - 180px);
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

    &::placeholder {
        color: #9ca3af;
    }
`;

const TextArea = styled.textarea`
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: inherit;
    resize: none;
    transition: border-color 0.15s ease;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: #9ca3af;
    }
`;

const ItemHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
`;

const AddItemButton = styled.button`
    padding: 0.375rem 0.75rem;
    border: 1px solid #2c64e9;
    border-radius: 0.375rem;
    background: white;
    color: #2c64e9;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: #eff6ff;
    }
`;

const ItemTableWrapper = styled.div`
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
`;

const ItemTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;

    th,
    td {
        padding: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
        text-align: center;
    }

    thead th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
    }

    tfoot th {
        background: #f9fafb;
        font-weight: 600;
        color: #1f2937;
        border-bottom: none;
    }

    tbody tr:last-child td {
        border-bottom: none;
    }
`;

const CellInput = styled.input`
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    color: #1f2937;

    &:focus {
        outline: none;
        border-color: #2c64e9;
        box-shadow: 0 0 0 2px rgba(44, 100, 233, 0.1);
    }
`;

const EmptyCell = styled.td`
    color: #9ca3af;
    padding: 1.25rem 0.5rem;
`;

const RemoveButton = styled.button`
    padding: 0.25rem 0.5rem;
    border: 1px solid #ef4444;
    border-radius: 0.25rem;
    background: white;
    color: #ef4444;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;

    &:hover {
        background: #fef2f2;
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
