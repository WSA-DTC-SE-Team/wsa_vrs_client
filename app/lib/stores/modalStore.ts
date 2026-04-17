import { create } from "zustand";

interface Modal {
    modalType: string;
    isOpen: boolean;
    vehicleId?: string;
    vehicleDistance?: number;
    startDate?: string;
    endDate?: string;
    reservationData?: {
        reservationId?: number;
        destination?: string;
        content?: string;
        employeeId?: number;
        status?: string;
    };
    recordData?: {
        id: number;
        isInspection: boolean;
        vehicleStatus?: string | null;
        totalDistance: number | null;
        beforeDistance: number | null;
        currentDistance: number | null;
        commuteDistance: number | null;
        businessDistance: number | null;
        content: string | null;
        useDate: string;
        createdDate?: string;
        vehicle: {
            id: number;
            number?: string;
            name?: string;
        };
        employee?: {
            employeeNumber: string;
            name?: string;
            affiliationName?: string;
        } | null;
    };
}

interface ModalState {
    modal: Modal | null;
    refreshKey: number;
    openModal: (
        modalType: string,
        vehicleId?: string,
        vehicleDistance?: number,
        startDate?: string,
        endDate?: string,
        reservationData?: {
            reservationId?: number;
            destination?: string;
            content?: string;
            emplopyeeNumber?: string;
            status?: string;
        },
        recordData?: {
            id: number;
            isInspection: boolean;
            vehicleStatus?: string | null;
            totalDistance: number | null;
            beforeDistance: number | null;
            currentDistance: number | null;
            commuteDistance: number | null;
            businessDistance: number | null;
            content: string | null;
            useDate: string;
            createdDate?: string;
            vehicle: {
                id: number;
                number?: string;
                name?: string;
            };
            employee?: {
                employeeNumber: string;
                name?: string;
                affiliationName?: string;
            } | null;
        },
    ) => void;
    closeModal: () => void;
    triggerRefresh: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    modal: null,
    refreshKey: 0,
    openModal: (
        modalType,
        vehicleId,
        vehicleDistance,
        startDate,
        endDate,
        reservationData,
        recordData,
    ) => {
        set({
            modal: {
                modalType,
                isOpen: true,
                vehicleId,
                vehicleDistance,
                startDate,
                endDate,
                reservationData,
                recordData,
            },
        });
    },
    closeModal: () =>
        set({
            modal: null,
        }),
    triggerRefresh: () =>
        set((state) => ({
            refreshKey: state.refreshKey + 1,
        })),
}));
