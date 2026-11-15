"use client";

import { Box, Typography, Avatar } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import AppAvatar from "@/src/shared/component/Avatar";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import type { TypingUser } from "@/src/common/store/useChatStore";

const dotBounce = keyframes`
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
`;

const Root = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  padding: "4px 16px",
  marginBottom: 6,
  animation: "fadeIn 0.25s ease-out",
  "@keyframes fadeIn": {
    "0%": { opacity: 0, transform: "translateY(4px)" },
    "100%": { opacity: 1, transform: "translateY(0)" },
  },
});

const BubbleWrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  maxWidth: "560px",
});

const SenderInfo = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
  paddingLeft: 4,
});

const SenderName = styled(Typography)<{ isBot?: boolean }>(({ isBot }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: isBot ? "#7C3AED" : "#2563EB",
}));

const BotBadge = styled(Box)({
  fontSize: 10,
  fontWeight: 700,
  color: "#6D28D9",
  backgroundColor: "#EDE9FE",
  borderRadius: 4,
  padding: "1px 6px",
  lineHeight: 1.2,
  display: "inline-flex",
  alignItems: "center",
});

const Bubble = styled(Box)<{ isBot?: boolean }>(({ isBot }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  backgroundColor: isBot ? "#FAF5FF" : "#FFFFFF",
  border: isBot ? "1px solid #E9D5FF" : "1px solid #E5E7EB",
  borderRadius: "18px 18px 18px 4px",
  padding: "9px 14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
}));

const DotsContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
});

const BouncingDot = styled(Box)<{ $delay: string; isBot?: boolean }>(({ $delay, isBot }) => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: isBot ? "#8B5CF6" : "#64748B",
  animation: `${dotBounce} 1.3s infinite ease-in-out`,
  animationDelay: $delay,
}));

interface TypingBubbleProps {
  user: TypingUser;
  isGroup?: boolean;
}

export default function TypingBubble({ user, isGroup = false }: TypingBubbleProps) {
  const isBot = Boolean(user.isBot || user.displayName === "ZAi");

  return (
    <Root>
      {isBot ? (
        <Avatar
          src={user.avatarUrl}
          sx={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            boxShadow: "0 2px 6px rgba(99,102,241,0.25)",
            flexShrink: 0,
            mb: 0.25,
          }}
        >
          <SmartToyOutlinedIcon sx={{ fontSize: 18, color: "#FFFFFF" }} />
        </Avatar>
      ) : (
        <Box sx={{ flexShrink: 0, mb: 0.25 }}>
          <AppAvatar
            src={resolveMediaUrl(user.avatarUrl) || undefined}
            name={user.displayName || "Thành viên"}
            size={32}
          />
        </Box>
      )}

      <BubbleWrap>
        {isGroup && (
          <SenderInfo>
            <SenderName isBot={isBot}>
              {isBot ? "ZAi" : user.displayName || "Thành viên"}
            </SenderName>
            {isBot && <BotBadge>BOT AI</BotBadge>}
          </SenderInfo>
        )}

        <Bubble isBot={isBot}>
          <DotsContainer>
            <BouncingDot $delay="0s" isBot={isBot} />
            <BouncingDot $delay="0.2s" isBot={isBot} />
            <BouncingDot $delay="0.4s" isBot={isBot} />
          </DotsContainer>

          <Typography
            sx={{
              fontSize: 12.5,
              color: isBot ? "#7C3AED" : "#64748B",
              fontStyle: "italic",
              fontWeight: 500,
            }}
          >
            {isBot ? "ZAi đang suy nghĩ..." : `${user.displayName || "Thành viên"} đang soạn tin...`}
          </Typography>
        </Bubble>
      </BubbleWrap>
    </Root>
  );
}
