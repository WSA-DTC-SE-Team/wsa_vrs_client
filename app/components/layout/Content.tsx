"use client";

import styles from "@/components/layout/style/layout.module.css";
import Navigation from "./Navigation";
import NavBar from "./NavBar";
import { useCarStore } from "@/lib/stores/carStore";
import { useEffect } from "react";

export default function Content({ children }: { children: React.ReactNode }) {
    const { fetchCars } = useCarStore();

    useEffect(() => {
        fetchCars();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className={styles.container}>
            <div className={styles.inner}>
                <Navigation />
                <div className={styles.home}>{children}</div>
            </div>
            <div className={styles.navbar}>
                <NavBar />
            </div>
        </main>
    );
}
