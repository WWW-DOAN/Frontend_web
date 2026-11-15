"use client";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTrans } from "@/src/common/utilities/hook/trans";

const Root = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 16px",
  minHeight: 28,
});

const Dot = styled(Box)({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: "#94A3B8",
  animation: "typingPulse 1.4s infinite ease-in-out",
  "&:nth-of-type(2)": {
    animationDelay: "0.2s",
  },
  "&:nth-of-type(3)": {
    animationDelay: "0.4s",
  },
  "@keyframes typingPulse": {
    "0%, 60%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
    "30%": { opacity: 1, transform: "scale(1)" },
  },
});

interface TypingIndicatorProps {
  names: string[];
  count: number;
  isBot?: boolean;
}

export default function TypingIndicator({ names, count, isBot }: TypingIndicatorProps) {
  const t = useTrans();
  const text = isBot
    ? "ZAi đang suy nghĩ..."
    : count === 1
      ? `${names[0]} ${t("CHAT.TYPING_SINGLE")}`
      : count === 2
        ? `${names[0]} ${t("CHAT.TYPING_DUAL", { name: names[1] })}`
        : t("CHAT.TYPING_MULTIPLE", { name: names[0], count: count - 1 });

  return (
    <Root sx={{ bgcolor: isBot ? "#FAF5FF" : "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Dot sx={{ bgcolor: isBot ? "#8B5CF6" : "#94A3B8" }} />
        <Dot sx={{ bgcolor: isBot ? "#8B5CF6" : "#94A3B8" }} />
        <Dot sx={{ bgcolor: isBot ? "#8B5CF6" : "#94A3B8" }} />
      </Box>
      <Typography variant="caption" sx={{ color: isBot ? "#7C3AED" : "#64748B", fontStyle: "italic", fontWeight: 500 }}>
        {text}
      </Typography>
    </Root>
  );
}
