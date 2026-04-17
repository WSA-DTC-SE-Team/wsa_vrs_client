import { GetData } from "@/components/features/getData";
import NewRecord from "@/components/modals/NewRecord";
import { Car } from "@/lib/stores/carStore";

export default async function page() {
    return (
        <div
            style={{
                width: "100%",
                padding: "1.5rem",
                backgroundColor: "#f9fafb",
                minHeight: "calc(100vh - var(--header-height))",
                marginBottom: "calc(100px + env(safe-area-inset-bottom))",
            }}
        >
            <NewRecord isPage={true} />
        </div>
    );
}
