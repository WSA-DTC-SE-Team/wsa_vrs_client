"use client";

import styled from "@emotion/styled";
import {
    ModalContentContainer,
    ModalHeader,
    ModalContent,
    Xbutton,
    ModalLabel,
    ModalFooter,
    FullWidthContainer,
    Button,
    InputGroup,
    StyledInput,
    StyledTextarea,
} from "./styles/modalStyling";
import { useModalStore } from "@/lib/stores/modalStore";
import { FormEvent, useEffect, useState } from "react";
import { useCarStore } from "@/lib/stores/carStore";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import useAlertStore from "@/lib/stores/alertStore";
import { AxiosError } from "axios";

const NewCar = () => {
    const { closeModal, modal, triggerRefresh } = useModalStore();
    const router = useRouter();

    const { setAlert } = useAlertStore();
    const [isReady, setIsReady] = useState(!modal?.vehicleId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    console.log("modal", modal);
    const [carState, setCarState] = useState({
        id: modal?.vehicleId,
        ownerType: "HQ",
        number: "",
        name: "",
        registerDate: "",
        drivingDate: "",
        fuelType: "DIESEL",
        inspectionDate: "",
        content: "",
        distance: 0,
    });
    const { fetchCars } = useCarStore();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post(
                "/vrs/vehicles/create",
                carState,
            );

            // 차량 목록 새로고침
            await fetchCars();
            triggerRefresh();
            setAlert("success", "차량이 등록 되었습니다.");

            closeModal();

            // Server Component 데이터 갱신 (refresh 대신 현재 페이지로 replace)
            setTimeout(() => {
                router.replace(window.location.pathname + window.location.search);
            }, 100);
        } catch (error) {
            const axiosError = error as AxiosError<{ detail?: string }>;
            setAlert(
                "error",
                axiosError.response?.data?.detail || "차량 등록에 실패했습니다.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (modal?.vehicleId) {
            const fetchVehicleData = async () => {
                try {
                    const res = await axiosInstance.get(
                        `/vrs/vehicles/${modal.vehicleId}`,
                    );
                    setCarState(res.data);
                    setIsReady(true);
                } catch (error) {
                    console.error("차량 정보 불러오기 실패:", error);
                    setIsReady(true);
                }
            };
            fetchVehicleData();
        }
    }, [modal?.vehicleId]);

    if (!isReady) return <div></div>;

    return (
        <ModalContentContainer onSubmit={handleSubmit}>
            <ModalHeader>
                <h2>신규 차량 등록</h2>
                <Xbutton onClick={closeModal}>✕</Xbutton>
            </ModalHeader>
            <ModalContent>
                <InputGroup>
                    <ModalLabel>소속</ModalLabel>
                    <FuelTypeButtonGroup>
                        <FuelTypeButton
                            type="button"
                            active={carState.ownerType === "HQ"}
                            onClick={() =>
                                setCarState({
                                    ...carState,
                                    ownerType: "HQ",
                                })
                            }
                        >
                            본사
                        </FuelTypeButton>
                        <FuelTypeButton
                            type="button"
                            active={carState.ownerType === "DT"}
                            onClick={() =>
                                setCarState({
                                    ...carState,
                                    ownerType: "DT",
                                })
                            }
                        >
                            DT Center
                        </FuelTypeButton>
                    </FuelTypeButtonGroup>
                </InputGroup>
                <div></div>
                <InputGroup>
                    <ModalLabel>차량 번호</ModalLabel>
                    <StyledInput
                        type="text"
                        placeholder="예: 12가 3456"
                        value={carState.number}
                        onChange={(e) =>
                            setCarState({
                                ...carState,
                                number: e.target.value,
                            })
                        }
                    />
                </InputGroup>
                <InputGroup>
                    <ModalLabel>차량 모델</ModalLabel>
                    <StyledInput
                        type="text"
                        placeholder="예: 그랜저"
                        value={carState.name}
                        onChange={(e) =>
                            setCarState({ ...carState, name: e.target.value })
                        }
                    />
                </InputGroup>
                <InputGroup>
                    <ModalLabel>차량 등록일</ModalLabel>
                    <StyledInput
                        type="date"
                        value={carState.registerDate}
                        onChange={(e) =>
                            setCarState({
                                ...carState,
                                registerDate: e.target.value,
                            })
                        }
                    />
                </InputGroup>
                <InputGroup>
                    <ModalLabel>운행 개시일</ModalLabel>
                    <StyledInput
                        type="date"
                        value={carState.drivingDate}
                        onChange={(e) =>
                            setCarState({
                                ...carState,
                                drivingDate: e.target.value,
                            })
                        }
                    />
                </InputGroup>
                <InputGroup>
                    <ModalLabel>연료 유형</ModalLabel>
                    <FuelTypeButtonGroup>
                        <FuelTypeButton
                            type="button"
                            active={carState.fuelType === "DIESEL"}
                            onClick={() =>
                                setCarState({
                                    ...carState,
                                    fuelType: "DIESEL",
                                })
                            }
                        >
                            경유
                        </FuelTypeButton>
                        <FuelTypeButton
                            type="button"
                            active={carState.fuelType === "GAS"}
                            onClick={() =>
                                setCarState({
                                    ...carState,
                                    fuelType: "GAS",
                                })
                            }
                        >
                            휘발유
                        </FuelTypeButton>
                        <FuelTypeButton
                            type="button"
                            active={carState.fuelType === "ELECTRIC"}
                            onClick={() =>
                                setCarState({
                                    ...carState,
                                    fuelType: "ELECTRIC",
                                })
                            }
                        >
                            전기
                        </FuelTypeButton>
                    </FuelTypeButtonGroup>
                </InputGroup>
                <InputGroup>
                    <ModalLabel>최근 검사일</ModalLabel>
                    <StyledInput
                        type="date"
                        value={carState.inspectionDate}
                        onChange={(e) =>
                            setCarState({
                                ...carState,
                                inspectionDate: e.target.value,
                            })
                        }
                    />
                </InputGroup>
                <FullWidthContainer>
                    <ModalLabel>비고</ModalLabel>
                    <StyledTextarea
                        rows={4}
                        value={carState.content}
                        onChange={(e) =>
                            setCarState({
                                ...carState,
                                content: e.target.value,
                            })
                        }
                        placeholder="추가 정보를 입력하세요"
                    />
                </FullWidthContainer>
            </ModalContent>
            <ModalFooter>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={isSubmitting}
                >
                    취소
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? "등록 중..." : "등록"}
                </Button>
            </ModalFooter>
        </ModalContentContainer>
    );
};

export default NewCar;

// Styled Components
const FuelTypeButtonGroup = styled.div`
    display: flex;
    gap: 0.5rem;
    width: 100%;
`;

const FuelTypeButton = styled.button<{ active: boolean }>`
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid ${(props) => (props.active ? "#0064fe" : "#d1d5db")};
    border-radius: 0.375rem;
    background-color: ${(props) => (props.active ? "#eff6ff" : "#fff")};
    color: ${(props) => (props.active ? "#0064fe" : "#6b7280")};
    font-size: 0.875rem;
    font-weight: ${(props) => (props.active ? "600" : "500")};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: #0064fe;
        background-color: #eff6ff;
        color: #0064fe;
    }

    &:active {
        transform: scale(0.98);
    }

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.625rem 0.75rem;
        font-size: 0.9375rem;
    }
`;
