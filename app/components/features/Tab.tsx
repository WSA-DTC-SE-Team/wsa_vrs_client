"use client";

import styled from "@emotion/styled";

interface TabItem {
    id: string;
    label: string;
}

interface TabProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

const Tab = ({ tabs, activeTab, onTabChange }: TabProps) => {
    return (
        <TabContainer>
            {tabs.map((tab) => (
                <TabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </TabButton>
            ))}
        </TabContainer>
    );
};

export default Tab;

// Styled Components
const TabContainer = styled.div`
    display: flex;
    gap: 0.5rem;
    flex: 1;
    margin-top: 1rem;
    border-bottom: 2px solid #e5e7eb;
    position: relative;
`;

const TabButton = styled.button<{ active: boolean }>`
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    background: none;
    cursor: pointer;
    position: relative;
    background: ${(props) => (props.active ? "#fff" : "none")};
    color: ${(props) => (props.active ? "#0064fe" : "#6b7280")};
    transition: color 0.2s ease;

    &::after {
        content: "";
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background-color: ${(props) =>
            props.active ? "#0064fe" : "transparent"};
        transition: background-color 0.2s ease;
        z-index: 1;
    }

    &:hover {
        color: #0064fe;
    }

    @media (max-width: 768px) {
        padding: 0.875rem 1.25rem;
        font-size: 0.9375rem;
        flex: 1;
    }
`;
