import { create } from "zustand";

export type AlertType = "success" | "error" | "information" | "confirm";

interface AlertState {
    type: AlertType | null;
    script: string;
    confirmOkay?: ((id?: number) => void) | null;
    setAlert: (
        alertType: AlertType,
        script?: string,
        confirmOkay?: (id?: number) => void
    ) => void;
    resetAlert: () => void;
}
const useAlertStore = create<AlertState>((set) => ({
    type: null,
    script: "",
    confirmOkay: undefined,
    setAlert: (alertType, script = "", confirmOkay) => {
        set(() => ({ type: alertType, script, confirmOkay }));
    },
    resetAlert: () => {
        set(() => ({ type: null, script: "", confirmOkay: undefined }));
    },
}));

export default useAlertStore;
