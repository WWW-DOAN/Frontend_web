"use client";

import { useChatStore } from "@/src/common/store/useChatStore";
import { useTrans } from "@/src/common/utilities/hook/trans";
import AppAvatar from "@/src/shared/component/Avatar";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import { Box, IconButton, Typography, useMediaQuery } from "@mui/material";
import { styled } from "@mui/material/styles";
import PhoneIcon from "@mui/icons-material/Phone";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { startCall, startGroupCall } from "@/src/common/action/call.action";
import { useMemo } from "react";

interface ChatHeaderProps {
  socketConnected: boolean;
  error?: string | null;
  conversationId: string | null;
  onToggleSearch?: () => void;
  onToggleInfo?: () => void;
  onBackClick?: () => void;
}

const HeaderRoot = styled(Box)({
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  background: "#FFFFFF",
  borderBottom: "1px solid #E5E7EB",
});

const HeaderLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: 1,
  minWidth: 0,
});

const ConvInfo = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  flex: 1,
});

const ConvName = styled(Typography)({
  fontSize: 16,
  fontWeight: 600,
  color: "#111827",
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const ConvStatus = styled(Box)({
  fontSize: 12,
  color: "#6B7280",
  lineHeight: 1.2,
  display: "flex",
  alignItems: "center",
  gap: 5,
});

const StatusDot = styled(Box, {
  shouldForwardProp: (prop) => prop !== "online",
})<{ online?: boolean }>(({ online }) => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: online ? "#22C55E" : "#9CA3AF",
  flexShrink: 0,
}));

const Actions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 2,
});

const ActionBtn = styled(IconButton)({
  width: 34,
  height: 34,
  borderRadius: 8,
  color: "#4B5563",
  "&:hover": {
    backgroundColor: "#F3F4F6",
    color: "#005AE0",
  },
});

const StyledAvatar = styled(Box)({
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#E0ECFF",
  color: "#0A56CC",
  fontWeight: 700,
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export default function ChatHeader({
  socketConnected,
  conversationId,
  onToggleSearch,
  onToggleInfo,
  onBackClick,
}: ChatHeaderProps) {
  const isMobile = useMediaQuery('(max-width:767px)');
  const listConversation = useChatStore((s) => s.listConversation);
  const conversationDetailById = useChatStore((s) => s.conversationDetailById);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const currentUserId = useChatStore((s) => s.currentUserId);
  const convDetail = conversationId ? conversationDetailById[conversationId] : null;
  const conversation = convDetail || listConversation.find((item) => item.id === conversationId);
  const t = useTrans();

  const isDirect = conversation?.type !== "group" && conversation?.type !== "GROUP" && conversation?.type !== undefined;
  const members = conversation?.members || [];
  const otherMember = isDirect
    ? members.find((m: any) => (m.userId || m.id || m.user_id) !== currentUserId)
    : null;
  const otherUserId = otherMember?.userId || (otherMember as any)?.id || (otherMember as any)?.user_id;
  const isOtherOnline = otherUserId ? onlineUserIds.includes(otherUserId) : false;
  const statusOnline = isDirect ? isOtherOnline : socketConnected;

  const typingMap = useChatStore((s) => s.typingUsersByConversation);
  const typingUsers = (conversationId ? typingMap[conversationId] : undefined) || [];
  const isTyping = typingUsers.length > 0;

  const memberAvatars = useMemo(() => {
    if (isDirect) return [];
    return (members || [])
      .map((m: any) => resolveMediaUrl(m.avatarUrl))
      .filter(Boolean) as string[];
  }, [isDirect, members]);

  const totalMembers = conversation?.members?.length || conversation?.memberCount || 0;

  const statusText = isDirect
    ? isOtherOnline ? t("CHAT.STATUS_ONLINE") : t("CHAT.INACTIVE")
    : t("CHAT.MEMBER_COUNT", { count: totalMembers });

  return (
    <HeaderRoot>
      <HeaderLeft>
        {isMobile && onBackClick && (
          <IconButton size="small" onClick={onBackClick} sx={{ color: "#4B5563", mr: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        {!isDirect ? (
          <AppAvatar
            src={resolveMediaUrl(conversation?.avatarUrl) || undefined}
            name={conversation?.name || "Group"}
            size={40}
            isGroup={true}
            memberAvatars={memberAvatars}
          />
        ) : (
          <AppAvatar
            src={resolveMediaUrl(otherMember?.avatarUrl || conversation?.avatarUrl) || undefined}
            name={otherMember?.nickname || otherMember?.displayName || conversation?.name || "C"}
            size={40}
            isGroup={false}
          />
        )}
        <ConvInfo>
          <ConvName>
            {isDirect
              ? (otherMember?.nickname || otherMember?.displayName || conversation?.name || t("CHAT.DEFAULT_NAME"))
              : (conversation?.name || t("CHAT.DEFAULT_NAME"))}
          </ConvName>
          <ConvStatus>
            {isTyping ? (
              <>
                <StatusDot online={true} sx={{ bgcolor: "#0068FF", animation: "pulse 1.2s infinite" }} />
                <Typography sx={{ fontSize: 12, color: "#0068FF", fontWeight: 500 }}>
                  {typingUsers[0]?.displayName || "Thành viên"} đang nhập...
                </Typography>
              </>
            ) : (
              <>
                {!isDirect && <StatusDot online={socketConnected} />}
                {isDirect && <StatusDot online={statusOnline} />}
                <span>{statusText}</span>
              </>
            )}
          </ConvStatus>
        </ConvInfo>
      </HeaderLeft>

      <Actions>
        {isDirect ? (
          <>
            <ActionBtn aria-label={t("CHAT.CALL_AUDIO")} onClick={() => conversationId && startCall(conversationId, "AUDIO")}><PhoneIcon fontSize="small" /></ActionBtn>
            <ActionBtn aria-label={t("CHAT.CALL_VIDEO")} onClick={() => conversationId && startCall(conversationId, "VIDEO")}><VideoCallIcon fontSize="small" /></ActionBtn>
          </>
        ) : (
          <>
            <ActionBtn aria-label={t("CHAT.CALL_GROUP")} onClick={() => conversationId && startGroupCall(conversationId)}><PhoneIcon fontSize="small" /></ActionBtn>
            <ActionBtn aria-label="Gọi video nhóm" onClick={() => conversationId && startGroupCall(conversationId)}><VideoCallIcon fontSize="small" /></ActionBtn>
          </>
        )}
        <ActionBtn aria-label={t("CHAT.SEARCH")} onClick={onToggleSearch}><SearchIcon fontSize="small" /></ActionBtn>
        <ActionBtn aria-label={t("CHAT.INFO")} onClick={onToggleInfo}><ViewSidebarOutlinedIcon fontSize="small" /></ActionBtn>
      </Actions>
    </HeaderRoot>
  );
}
