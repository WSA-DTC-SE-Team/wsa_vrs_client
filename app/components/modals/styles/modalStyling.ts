import styled from "@emotion/styled";

const ModalContentContainer = styled.form`
    width: 100%;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - var(--header-height) - 150px);
    overflow: hidden;
`;

const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;

    h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
    }

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 1.25rem 1rem;

        h2 {
            font-size: 1.125rem;
        }
    }

    /* 태블릿 */
    @media (min-width: 768px) and (max-width: 1023px) {
        padding: 1.25rem;

        h2 {
            font-size: 1.125rem;
        }
    }
`;

const Xbutton = styled.button`
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    transition: all 0.2s;

    &:hover {
        background-color: #f3f4f6;
        color: #1f2937;
    }
`;

const ModalContent = styled.div`
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 1rem;
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    /* 태블릿 */
    @media (min-width: 768px) and (max-width: 1023px) {
        padding: 1.25rem;
    }
`;

const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const ModalLabel = styled.label`
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;

    /* 모바일 */
    @media (max-width: 767px) {
        font-size: 0.8125rem;
    }
`;

const StyledInput = styled.input`
    padding: 0.25rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    transition: all 0.2s;
    min-height: 38px;

    &:focus {
        outline: none;
        border-color: #2c64e9;
        box-shadow: 0 0 0 3px rgba(44, 100, 233, 0.1);
    }

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.5rem 0.75rem;
        font-size: 0.9375rem;
        min-height: 44px;
    }
`;

const StyledSelect = styled.select`
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    background-color: white;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 38px;

    &:focus {
        outline: none;
        border-color: #2c64e9;
        box-shadow: 0 0 0 3px rgba(44, 100, 233, 0.1);
    }

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.5rem 0.75rem;
        font-size: 0.9375rem;
        min-height: 44px;
    }
`;

const StyledTextarea = styled.textarea`
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    resize: vertical;
    font-family: inherit;
    transition: all 0.2s;
    resize: none;
    min-height: 80px;

    &:focus {
        outline: none;
        border-color: #2c64e9;
        box-shadow: 0 0 0 3px rgba(44, 100, 233, 0.1);
    }

    /* 모바일 */
    @media (max-width: 767px) {
        padding: 0.625rem 0.75rem;
        font-size: 0.9375rem;
        min-height: 90px;
    }
`;

const FullWidthContainer = styled.div`
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const ModalFooter = styled.div`
    padding: 1rem 1.5rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-shrink: 0;

    /* 모바일/태블릿 */
    @media (max-width: 1023px) {
        padding: 1rem;
        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
        flex-direction: column;
        position: sticky;
        bottom: 0;
        background-color: white;
    }
`;

const Button = styled.button<{ variant?: "primary" | "secondary" | "danger" }>`
    padding: 0.625rem 1.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;

    ${(props) =>
        props.variant === "primary"
            ? `
        background-color: #2c64e9;
        color: white;

        &:hover:not(:disabled) {
            background-color: #1e4fd9;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: #93c5fd;
        }
    `
            : props.variant === "danger"
              ? `
        background-color: #dc2626;
        color: white;

        &:hover:not(:disabled) {
            background-color: #b91c1c;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: #fca5a5;
        }
    `
              : `
        background-color: #f3f4f6;
        color: #374151;

        &:hover:not(:disabled) {
            background-color: #e5e7eb;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `}

    /* 모바일 */
    @media (max-width: 767px) {
        width: 100%;
        padding: 0.75rem;
    }
`;

export {
    ModalContentContainer,
    ModalHeader,
    Xbutton,
    ModalContent,
    ModalFooter,
    ModalLabel,
    InputGroup,
    StyledInput,
    StyledSelect,
    StyledTextarea,
    FullWidthContainer,
    Button,
};
