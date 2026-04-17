"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "@/components/layout/style/layout.module.css";
import Icon from "@/components/common/CustomIcon";
import useUserStore from "@/lib/stores/userStore";
// import useLoadingStore from "@/lib/stores/loadingStore";

const NavBar = () => {
    const route = useRouter();
    const path = usePathname();
    const { user } = useUserStore();
    const employeeId = user?.employeeNumber || 0;

    const today = new Date();

    const kstDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(today);

    const currentYear = today.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // const { setLoading } = useLoadingStore();
    const handleClick = (routeName: string) => {
        if (routeName === "") {
            route.back();
            return;
        }

        if (path === routeName) {
            return;
        }

        route.push(routeName);
        // setLoading(true);
    };
    const navList = [
        {
            icon: "pageLeft",
            onClick: () => {
                handleClick("");
            },
        },
        {
            icon: "home",
            onClick: () => {
                handleClick(`/`);
            },
            color: "var(--header-blue)",
        },
        {
            icon: "user",
            onClick: () => {
                handleClick(
                    `/my-records/${employeeId}/reservation/${yearStart}/${yearEnd}`,
                );
            },
        },
        {
            icon: "pen",
            onClick: () => {
                handleClick("/new-records");
            },
        },
    ];

    return (
        <nav className={`${styles.navbar}`}>
            <ul
                className={`${styles.fixed_bar}w-full  h-full flex items-center justify-center ${styles.fixed_bar}`}
            >
                {navList.map((nav, index) => (
                    <li
                        key={index}
                        className={`flex-1 text-center`}
                        onClick={nav.onClick}
                    >
                        <Icon
                            name={nav.icon}
                            size={28}
                            color={nav?.color && nav.color}
                        />
                    </li>
                ))}
            </ul>
        </nav>
    );
};
export default NavBar;
