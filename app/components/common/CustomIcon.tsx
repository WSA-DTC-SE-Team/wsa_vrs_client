import { CSSProperties } from "react";
import { Icons, DEFAULT_SIZE, DEFAULT_COLOR } from "@/assets/icons";

interface IconsProps {
    name: keyof typeof Icons;
    size?: number;
    color?: string;
    style?: CSSProperties;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    className?: string;
}

const Icon = ({
    name,
    size = DEFAULT_SIZE,
    color = DEFAULT_COLOR,
    style,
    onClick,
    onMouseEnter,
    onMouseLeave,
    className,
}: IconsProps) => {
    const IconComponent = Icons[name];

    // IconComponent가 undefined일 경우, 기본 아이콘을 반환하거나 null을 반환
    if (!IconComponent) {
        return null;
    }

    return (
        <IconComponent
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            size={size}
            color={color}
            className={className}
            style={style}
        />
    );
};

export default Icon;
