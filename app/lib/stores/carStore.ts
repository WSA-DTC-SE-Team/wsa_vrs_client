import { create } from "zustand";
import axiosInstance from "@/lib/axios";

export interface Car {
    id: number;
    number: string;
    name: string;
    content: string | null;
    vehicleStatus: string | null;
    fuelType: string;
    registerDate: string;
    drivingDate: string | null;
    inspectionDate: string;
    distance?: number;
    missingDistance?: number | null;
    ownerType: string;
    //  vehicleReservations?: any[] | null;
}

interface CarState {
    cars: Car[];
    isLoading: boolean;
    error: string | null;
    fetchCars: () => Promise<void>;
    setCars: (cars: Car[]) => void;
    addCar: (car: Omit<Car, "status">) => void;
    reset: () => void;
}

export const useCarStore = create<CarState>((set) => ({
    cars: [],
    isLoading: false,
    error: null,
    fetchCars: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get("/vrs/vehicles/find/all");
            // 페이지네이션 응답에서 content 배열 추출
            const carsData = response.data?.content || response.data || [];
            set({ cars: carsData, isLoading: false });
        } catch (error) {
            console.error("차량 목록 조회 실패:", error);
            set({
                error: "차량 목록을 불러오는데 실패했습니다.",
                isLoading: false,
            });
        }
    },
    setCars: (cars) => set({ cars, isLoading: false }),
    addCar: (car) =>
        set((state) => ({
            cars: [...state.cars, car],
            isLoading: false,
        })),
    reset: () => set({ cars: [], isLoading: false, error: null }),
}));
