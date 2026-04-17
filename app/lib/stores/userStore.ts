import { create } from "zustand";

interface Employee {
    id: number;
    name: string;
    position: string;
    employeeNumber: string;
    affiliationName: string;
}

interface UserState {
    user: Employee | null;
    isLoading: boolean;
    unreadCount: number;
    setUser: (employee: Employee | null) => void;
    clearUser: () => void;
    setUnreadCount: (count: number) => void;
    decrementUnreadCount: () => void;
}

const useUserStore = create<UserState>((set) => ({
    user: null,
    isLoading: false,
    unreadCount: 0,

    setUser: (user) => set({ user, isLoading: false }),

    clearUser: () => set({ user: null }),

    setUnreadCount: (count) => set({ unreadCount: count }),

    decrementUnreadCount: () =>
        set((state) => ({
            unreadCount: Math.max(0, state.unreadCount - 1),
        })),
}));

export default useUserStore;
