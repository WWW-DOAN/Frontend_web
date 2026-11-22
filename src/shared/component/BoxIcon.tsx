"use client";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import type { MouseEvent } from "react";
interface BoxIconProps {
    outlined: React.ElementType;
    filled: React.ElementType;
    selected?: boolean;
    onClick?:  (event: React.MouseEvent<HTMLDivElement>) => void;
}

const StyledBoxIcon = styled(Box, {
    shouldForwardProp: (prop) => prop !== "selected",
})<{ selected?: boolean }>(({ selected }) => ({
    borderRadius: "10px",
    minHeight: "48px",
    minWidth: "48px",
    backgroundColor: selected ? "rgba(255, 255, 255, 0.2)" : "transparent",
    transition: "all 0.2s ease",
    "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.14)",
        cursor: "pointer",
    },
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
}));

const BoxIcon = ({
    outlined: OutlinedIcon,
    filled: FilledIcon,
    selected,
    onClick,
}: BoxIconProps) => {
    const IconComponent = selected ? FilledIcon : OutlinedIcon;

    return (
        <StyledBoxIcon selected={selected} onClick={onClick}>
            <IconComponent
                sx={{
                    color: "#fff",
                    fontSize: 26,
                }}
            />
        </StyledBoxIcon>
    );
};

export default BoxIcon;
