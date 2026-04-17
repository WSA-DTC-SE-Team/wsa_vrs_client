"use client";

import { useModalStore } from "@/lib/stores/modalStore";
import styled from "@emotion/styled";
import NewCar from "@/components/modals/NewCar";
import NewRecord from "../modals/NewRecord";
import Reservation from "../modals/Reservation";
import EditVehicle from "../modals/EditVehicle";
import EditRecord from "../modals/EditRecord";

const Modal = () => {
    const { closeModal, modal } = useModalStore();

    const returnModal = (modalType: string) => {
        switch (modalType) {
            case "NEW_CAR":
                return <NewCar />;
            case "NEW_RECORD":
                return <NewRecord />;
            case "NEW_RESERVATION":
                return <Reservation />;
            case "EDIT_RESERVATION":
                return <Reservation />;
            case "EDIT_VEHICLE":
                return <EditVehicle />;
            case "EDIT_RECORD":
                return <EditRecord />;
            default:
                return null;
        }
    };
    return (
        <ModalBackground onMouseDown={closeModal} isOpen={modal?.isOpen}>
            <ModalInner
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) =>
                    e.stopPropagation()
                }
            >
                {returnModal(modal?.modalType || "")}
            </ModalInner>
        </ModalBackground>
    );
};

export default Modal;

const ModalBackground = styled.div<{ isOpen?: boolean }>`
    position: fixed;
    top: 0;
    left: 0;

    width: 100vw;
    height: 100vh;

    background-color: rgba(0, 0, 0, 0.5);

    display: ${(props: { isOpen?: boolean }) =>
        props.isOpen ? "flex" : "none"};
    align-items: center;
    justify-content: center;

    z-index: 30;
`;

const ModalInner = styled.div`
    max-width: 600px;
    width: 95%;

    display: flex;
    flex-direction: column;

    position: fixed;
    top: 53.5%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #fff;

    border-radius: 0.75rem;
    box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;
