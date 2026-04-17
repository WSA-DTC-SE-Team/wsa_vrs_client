"use client";

import styled from "@emotion/styled";
import Image from "next/image";

import { HiOutlineViewGrid, HiBell } from "react-icons/hi";
import { BiLogOut } from "react-icons/bi";
import { useEffect, useState } from "react";
import axios from "axios";

import useUserStore from "@/lib/stores/userStore";
import { useRouter } from "next/navigation";

interface HeaderProps {
    showNotification?: boolean;
    initialUnreadCount?: number;
}

const DEV_PORTAL_URL = "http://portal.dtcenter.com:4000/portal";
const TEMPT_PORTAL_URL = "https://portal.mswpms.co.kr:444/";

export default function Header({
    showNotification = false,
    initialUnreadCount = 0,
}: HeaderProps) {
    const [loading, setLoading] = useState(false);
    const { setUser, user } = useUserStore();
    const router = useRouter();

    useEffect(() => {
        axios
            .get(`/api/ems/employees/me`)
            .then((res) => {
                setUser(res.data);
            })
            .catch((error) => {
                console.error("사용자 정보 조회 실패:", error);
                //  window.location.href = TEMPT_PORTAL_URL;
            })
            .finally(() => {
                setLoading(false);
            });
    }, [setUser]);

    const backPortal = () => {
        window.location.href = TEMPT_PORTAL_URL;
    };

    const logout = () => {
        axios
            .post(`/api/auth/logout`)
            .then(() => {
                // setAlert("success", "로그아웃 되었습니다.");
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                setTimeout(() => {
                    window.location.href = TEMPT_PORTAL_URL;
                }, 1000);
            });
    };

    return (
        <HeaderContainer>
            <Logo onClick={() => router.push("/")}>
                <Image
                    className="img"
                    src="/assets/logo.png"
                    alt="WSA Logo"
                    width={32}
                    height={32}
                />
                WSA 차량 관리
            </Logo>
            <Spacer />
            <UserInfo>
                {loading ? (
                    <Skeleton />
                ) : (
                    <>
                        <Greeting>반갑습니다, </Greeting>
                        {user?.name}{" "}
                        <Greeting>({user?.affiliationName})</Greeting> 님
                    </>
                )}
            </UserInfo>
            <HeaderRight>
                <IconButton>
                    <HiOutlineViewGrid onClick={backPortal} />
                </IconButton>

                <IconButton onClick={logout}>
                    <BiLogOut />
                </IconButton>
            </HeaderRight>
        </HeaderContainer>
    );
}

const HeaderContainer = styled.header`
    width: 100%;
    height: var(--header-height);

    display: flex;
    align-items: center;

    padding: 0 1.5rem;

    background-color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-bottom: 1px solid #e5e7eb;

    z-index: 200;
    position: fixed;
    top: 0;
    left: 0;
    @media (max-width: 1023px) {
        padding: 0 1rem;
    }
`;

const Logo = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;

    font-size: 1.1rem;
    font-weight: 700;

    background: linear-gradient(
        135deg,
        hsl(220 70% 25%) 0%,
        hsl(200 80% 35%) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    .img {
        @media (max-width: 1023px) {
            width: 28px;
            height: 28px;
        }

        @media (max-width: 480px) {
            width: 26px;
            height: 26px;
        }
    }
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 1em;

    @media (max-width: 1023px) {
        gap: 0.5rem;
    }
`;

const UserInfo = styled.div`
    font-size: 1rem;
    font-weight: 600;

    margin-right: 1rem;

    color: #374459;
`;

const Greeting = styled.span`
    @media (max-width: 1023px) {
        display: none;
    }
`;

const Spacer = styled.div`
    flex: 1;
`;

const IconButton = styled.button`
    width: 36px;
    height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    position: relative;
    border: 1px solid #c3dae6;
    border-radius: 50%;
    background: #e8f6ff;

    cursor: pointer;
    transition: all 0.2s ease;

    svg {
        width: 20px;
        height: 20px;
        color: #0284c7;
    }

    &:hover {
        background: #bae6fd;
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
        background: #7dd3fc;
    }

    @media (max-width: 1023px) {
        width: 36px;
        height: 36px;

        svg {
            width: 22px;
            height: 22px;
        }
    }

    @media (max-width: 480px) {
        width: 33px;
        height: 33px;

        svg {
            width: 20px;
            height: 20px;
        }
    }
`;

const Skeleton = styled.div`
    width: 120px;
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;

    @keyframes loading {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }

    @media (max-width: 1023px) {
        width: 80px;
        height: 14px;
    }
`;
