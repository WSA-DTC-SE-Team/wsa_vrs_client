export const replaceDate = (date: string) => {
    if (date) {
        if (date.includes("T")) {
            return date.replaceAll("T", " ");
        } else {
            return date;
        }
    } else {
        return;
    }
};
