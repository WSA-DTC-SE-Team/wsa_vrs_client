"use client";
import useAlertStore, { AlertType } from "@/lib/stores/alertStore";
import styled from "@emotion/styled";
import { useEffect } from "react";
import Icon from "./CustomIcon";

export const CustomAlert = () => {
    const { type, script, confirmOkay, resetAlert } = useAlertStore();

    const basicScript = (script: string) => {
        if (!script) {
            switch (type) {
                case "success":
                    return "저장 되었습니다.";

                case "error":
                    return "에러가 발생하였습니다.";

                default:
                    return script;
            }
        } else {
            return script;
        }
    };

    const returnIconColor = (type: string) => {
        if (type !== null) {
            switch (type) {
                case "success":
                    return { color: "#2db32a", name: type };

                case "error":
                    return { color: "#ff4242", name: type };

                case "confirm":
                    return { color: "#f38a34", name: type };
            }
        } else {
            return { color: "transparent", name: "error" };
        }
    };

    useEffect(() => {
        if (type !== null && type !== "confirm") {
            const timer = setTimeout(() => {
                resetAlert();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [type]);
    return (
        <AlertContainer type={type} confirm={type === "confirm" ? true : false}>
            {type !== "confirm" ? (
                <AlertInner>
                    <SideType
                        backgroundColor={
                            type !== null
                                ? returnIconColor(type)!.color
                                : "black"
                        }
                    ></SideType>
                    <IconWrapper
                        borderColor={
                            type !== null
                                ? returnIconColor(type)!.color
                                : "black"
                        }
                    >
                        <Icon
                            name={
                                type !== null
                                    ? returnIconColor(type)!.name
                                    : "success"
                            }
                            size={16}
                            color={
                                type !== null
                                    ? returnIconColor(type)!.color
                                    : "black"
                            }
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                    </IconWrapper>
                    <p>{basicScript(script)}</p>

                    <Icon
                        onClick={() => resetAlert()}
                        name="xmark"
                        size={18}
                        color={
                            type !== null
                                ? returnIconColor(type)!.color
                                : "black"
                        }
                        style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            cursor: "pointer",
                        }}
                    />
                </AlertInner>
            ) : (
                <ConfirmInner>
                    <IconWrapper borderColor={returnIconColor(type)!.color}>
                        <Icon
                            name={script ? "confirm" : "bin"}
                            size={18}
                            color={returnIconColor(type)!.color}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                    </IconWrapper>
                    <p>{script ? script : "정말로 삭제하시겠습니까?"}</p>
                    <ConfirmDelete>
                        <button
                            onClick={() => {
                                if (type && confirmOkay) {
                                    confirmOkay();

                                    resetAlert();
                                } else {
                                }
                            }}
                        >
                            {script ? "확인" : "삭제"}
                        </button>
                        <button
                            onClick={() => {
                                console.log(
                                    "🔔 [CustomAlert] 취소 버튼 클릭됨",
                                );
                                resetAlert();
                            }}
                        >
                            취소
                        </button>
                    </ConfirmDelete>
                </ConfirmInner>
            )}
        </AlertContainer>
    );
};

const AlertContainer = styled.div<{
    type?: AlertType | null;
    confirm?: boolean;
}>`
    min-width: 300px;
    max-width: 600px;
    height: 80px;
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);

    border-radius: 0.2rem;
    background-color: var(--white);

    box-shadow: 1px 1px 2px 1px rgba(0, 0, 0, 0.3);
    z-index: 250;
    p {
        width: calc(100% - 7rem);
        margin-left: ${(props) => (props.confirm ? "0px" : "0.5rem")};
        margin-right: ${(props) => (props.confirm ? "0px" : "2rem")};

        font-size: 1.1rem;

        word-wrap: break-word; /* 단어가 길 경우 줄바꿈 */
        word-break: break-word; /* 줄바꿈 방식 설정 */

        @media (max-width: 768px) {
            font-size: 1.25rem;
            /* margin-top: 1rem; */
            white-space: pre-line; /* 모바일에서만 \n 문자를 줄바꿈으로 처리 */
        }
    }

    ${(props) =>
        props.type === null &&
        `
        display: none;
    `}

    ${(props) =>
        props.confirm &&
        `
        height: auto;
     
    `}

     @media (max-width: 768px) {
        max-width: 90%;
        /* padding: 1.5rem 0; */

        ${(props) =>
            props.confirm &&
            `


            
            
    `}
    }
`;

const AlertInner = styled.div`
    width: 100%;
    height: 100%;

    position: relative;

    display: flex;
    align-items: center;
    justify-content: left;
    gap: 1rem;
    & > * {
        flex-shrink: 0; /* Prevent shrinking */
    }
`;

const SideType = styled.div<{ backgroundColor?: string }>`
    width: 0.5rem;
    height: 100%;

    background-color: ${(props) =>
        props.backgroundColor !== null
            ? props.backgroundColor
            : "var(--black)"};
`;

const ConfirmInner = styled.div`
    width: 100%;
    height: 100%;

    /* padding: 0 1rem; */
    padding-top: 1.5rem;

    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    & > * {
        flex-shrink: 0; /* Prevent shrinking */
    }
    p {
        margin: 1rem;

        font-size: 1.1rem;
        text-align: center;
        display: -webkit-box;
        -webkit-line-clamp: 2; /* 최대 줄 수 */
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.2;
        /* 줄바꿈 관련 속성 추가 */
        word-break: keep-all; /* 줄바꿈을 띄어쓰기를 기준으로 우선 처리 */
        overflow-wrap: break-word; /* 단어가 길 경우에도 줄바꿈 */
        white-space: normal; /* 텍스트가 필요한 경우 줄바꿈 */
    }

    @media (max-width: 768px) {
        p {
            font-size: 1.3rem;
        }
    }
`;

const IconWrapper = styled.div<{ borderColor?: string; isPop?: boolean }>`
    width: 36px;
    height: 36px;

    position: relative;

    border-radius: 50%;
    border: ${(props) =>
        props.borderColor
            ? `5px solid ${props.borderColor}`
            : "6px solid var(--green800)"};

    background-color: transparent;
`;

const ConfirmDelete = styled.div<{ isPop?: boolean }>`
    width: 100%;

    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 10px;
    gap: 1rem;
    margin-bottom: 0.5rem;
    button {
        width: ${(props) => (props.isPop ? "40%" : "10rem")};
        height: ${(props) => (props.isPop ? "10rem" : "2.5rem")};

        border: none;
        cursor: pointer;

        font-size: ${(props) => props.isPop && "3rem"};
    }

    button:first-child {
        background-color: #f38a34;
        color: var(--white);
    }

    button:first-child:hover {
        background-color: #f04208;
    }

    button:last-child {
        background-color: lightgray;
        color: #666;
    }

    button:last-child:hover {
        background-color: darkgray;
        color: #fff;
    }
`;
