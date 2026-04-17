"use client";

interface AddButtonProps {
    modalType: string;
    title: string;
    vehicleId?: string;
    vehicleDistance?: number;
}

import { useModalStore } from "@/lib/stores/modalStore";
import styled from "@emotion/styled";

const AddButton = ({ title, modalType, vehicleId, vehicleDistance }: AddButtonProps) => {
    const { openModal } = useModalStore();

    const handleClick = () => {
        openModal(modalType, vehicleId, vehicleDistance);
    };
    return <AddButtonStyling onClick={handleClick}>{title}</AddButtonStyling>;
};

export default AddButton;

const AddButtonStyling = styled.button`
    padding: 0.5rem 1rem;
    background-color: white;
    color: rgb(44, 100, 233);
    border: 1px solid rgb(44, 100, 233);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: 0.2s;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 3px 0px,
        rgba(0, 0, 0, 0.06) 0px 1px 2px 0px;
`;
