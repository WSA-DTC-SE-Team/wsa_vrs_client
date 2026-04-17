"use server";

import { revalidateTag, revalidatePath } from "next/cache";

export async function revalidateVehicleRecords() {
    revalidateTag("vehicle-records");
}

export async function revalidateVehicleReservations() {
    revalidateTag("vehicle-reservations");
}

export async function revalidateVehicle() {
    revalidateTag("vehicle");
}

export async function revalidateAnnualRecords() {
    revalidateTag("annual-records");
}

// 페이지 전체 revalidate
export async function revalidateHomePage() {
    revalidatePath("/", "page");
}

export async function revalidateVehiclePage(vehicleId: string) {
    revalidatePath(`/vehicles/${vehicleId}`, "page");
}
