"use client";

import { Box, CircularProgress, Typography, Avatar, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useMemo } from "react";
import { PaginationState, UiMessage, AttachmentDto } from "@/src/common/interface/chat-interface";
import { useChatStore } from "@/src/common/store/useChatStore";
import type { TypingUser } from "@/src/common/store/useChatStore";
import { pinMessage, toggleReaction, unpinMessage, deleteMessageForMe } from "@/src/common/action/chat.action";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import MessageItem from "./MessageItem";
import SystemMessageBanner from "./message-system/SystemMessageBanner";
import TypingBubble from "./TypingBubble";
import { useTrans } from "@/src/common/utilities/hook/trans";
import i18n from "@/src/common/i18n/i18n";

interface MessageListProps {
  listRef: React.RefObject<HTMLDivElement | null>;
  messages: UiMessage[];
  currentUserId: string;
  conversationId: string;
  onReplyMessage: (message: UiMessage) => void;
  pagination?: PaginationState;
  onLoadMore: (conversationId: string) => void;
  onDeleteMessage: (conversationId: string, messageId: string) => void;
  onScroll: () => void;
  showScrollbar: boolean;
  onForwardMessage?: (messageId: string, conversationId: string) => void;
  onEditMessage?: (conversationId: string, messageId: string, newBody: string, createdAt: number) => void;
  onImageClick?: (url: string, mediaList: AttachmentDto[], index: number) => void;
}

const MessagesWrap = styled(Box, {
  shouldForwardProp: (prop) => prop !== "showScrollbar",
})<{ showScrollbar: boolean }>(({ showScrollbar }) => ({
  flex: 1,
  overflowY: "auto",
  backgroundColor: "#E2E9F1",
  padding: "10px 0",
  display: "flex",
  flexDirection: "column",
  scrollbarGutter: "stable",
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: showScrollbar ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0)",
    borderRadius: 8,
    transition: "background-color 0.2s ease",
  },
  "&::-webkit-scrollbar-track": { background: "transparent" },
}));

const MessagesContent = styled(Box)({
  display: "flex",
  flexDirection: "column",
  marginTop: "auto",
});

const LoadMoreWrap = styled(Box)({
  display: "flex",
  justifyContent: "center",
  marginBottom: 8,
});

const EmptyState = styled(Box)({
  flex: 1,
  minHeight: 240,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 8,
});

const EmptyTitle = styled(Typography)({ fontSize: 16, fontWeight: 600, color: "#111827" });
const EmptyDesc = styled(Typography)({ fontSize: 13, color: "#6B7280", textAlign: "center" });

const DateSeparator = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "16px 0",
});

const DateLabel = styled(Typography)({
  fontSize: 12,
  fontWeight: 500,
  color: "#475569",
  background: "#CBD5E1",
  padding: "3px 14px",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
});

// Stable reference: returning a fresh [] from a zustand selector makes
// getSnapshot unstable and triggers "Maximum update depth exceeded".
// Defined at module level (not import-time-empty-array in render) so the
// identity never changes between React renders.
const EMPTY_TYPING_USERS: TypingUser[] = [];

const formatDateLabel = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  if (msgDate.getTime() === today.getTime()) return i18n.t("CHAT.TODAY");
  if (msgDate.getTime() === yesterday.getTime()) return i18n.t("CHAT.YESTERDAY");

  const dayName = date.toLocaleDateString(locale, { weekday: "long" });
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  if (date.getFullYear() === now.getFullYear()) {
    return `${dayName}, ${dd}/${mm}`;
  }
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
};

export default function MessageList({
  listRef,
  messages,
  currentUserId,
  conversationId,
  onReplyMessage,
  pagination,
  onDeleteMessage,
  onScroll,
  showScrollbar,
  onForwardMessage,
  onEditMessage,
  onImageClick,
}: MessageListProps) {
  const t = useTrans();
  const paginationByConversation = useChatStore((s) => s.paginationByConversation);
  const pinnedMessagesMap = useChatStore((s) => s.pinnedMessagesByConversation);
  const reactionsMap = useChatStore((s) => s.reactionsByConversation);
  const listConversation = useChatStore((s) => s.listConversation);
  const conversationDetailById = useChatStore((s) => s.conversationDetailById);
  const pinnedMessages = pinnedMessagesMap[conversationId] || [];
  const reactionsForConv = reactionsMap[conversationId] || {};
  
  const pinnedMessageIds = useMemo(() => {
    return new Set(pinnedMessages.map((p: any) => p.messageId));
  }, [pinnedMessages]);
  
  const isMessagePinned = (messageId: string): boolean => {
    return pinnedMessageIds.has(messageId);
  };

  const convDetail = conversationDetailById[conversationId];
  const convFromList = listConversation.find((c) => c.id === conversationId);
  const members = convDetail?.members || convFromList?.members || [];

  const memberRolesMap = useMemo(() => {
    const map = new Map<string, string>();
    (members || []).forEach((m: any) => {
      const uid = m.userId || m.id;
      if (uid) {
        map.set(uid, (m.role || "MEMBER").toUpperCase());
      }
    });
    return map;
  }, [members]);

  const otherMembers = useMemo(() => {
    return (members || []).filter((m: any) => (m.userId || m.id) !== currentUserId);
  }, [members, currentUserId]);

  const typingUsers = useChatStore(
    (s) => (conversationId ? s.typingUsersByConversation[conversationId] : undefined) ?? EMPTY_TYPING_USERS
  );
  const isGroup =
    convDetail?.type === "group" ||
    convDetail?.type === "GROUP" ||
    convFromList?.type === "group" ||
    convFromList?.type === "GROUP";

  const currentMemberRole = memberRolesMap.get(currentUserId);
  const isGroupAdmin = currentMemberRole === "OWNER" || currentMemberRole === "ADMIN";
  const groupSettings = (convDetail as any)?.settings ?? (convFromList as any)?.settings;
  const canPinMessage = !isGroup || isGroupAdmin || groupSettings?.permissions?.canPinMessage !== false;

  const GROUP_TIME_LIMIT_MS = 2 * 60 * 1000; // 2 minutes

  const isZaiBotMessage = (msg: UiMessage): boolean =>
    msg.senderId === "00000000-0000-0000-0000-000000000001" ||
    (msg as any).type === "bot" ||
    /zai/i.test(msg.senderName || "");

  const resolveSenderName = (msg: UiMessage): string => {
    if (isZaiBotMessage(msg)) return "ZAi";
    if (msg.senderName && msg.senderName !== t("CHAT.USER")) return msg.senderName;
    const member = members?.find((m) => m.userId === msg.senderId);
    return member?.displayName || member?.username || msg.senderName || t("CHAT.USER");
  };

  const shouldShowDateSeparator = (msg: UiMessage, index: number): boolean => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const prevDate = new Date(prev.createdAt).toDateString();
    const currDate = new Date(msg.createdAt).toDateString();
    return prevDate !== currDate;
  };

  const getGroupingInfo = (msg: UiMessage, index: number) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const next = index < messages.length - 1 ? messages[index + 1] : null;

    const prevIsSystem = prev ? (prev.type === "system" || prev.message_type === "system") : false;
    const nextIsSystem = next ? (next.type === "system" || next.message_type === "system") : false;

    const isSameDayAsPrev = prev
      ? new Date(prev.createdAt).toDateString() === new Date(msg.createdAt).toDateString()
      : false;
    const isSameDayAsNext = next
      ? new Date(next.createdAt).toDateString() === new Date(msg.createdAt).toDateString()
      : false;

    const isGroupedWithPrev =
      !!prev &&
      !prevIsSystem &&
      isSameDayAsPrev &&
      prev.senderId === msg.senderId &&
      msg.createdAt - prev.createdAt <= GROUP_TIME_LIMIT_MS;

    const isGroupedWithNext =
      !!next &&
      !nextIsSystem &&
      isSameDayAsNext &&
      next.senderId === msg.senderId &&
      next.createdAt - msg.createdAt <= GROUP_TIME_LIMIT_MS;

    const isFirstInGroup = !isGroupedWithPrev;
    const isLastInGroup = !isGroupedWithNext;
    const isMiddleInGroup = isGroupedWithPrev && isGroupedWithNext;

    return {
      isFirstInGroup,
      isLastInGroup,
      isMiddleInGroup,
      isGrouped: isGroupedWithPrev,
    };
  };

  return (
    <MessagesWrap ref={listRef} onScroll={onScroll} showScrollbar={showScrollbar}>
      {paginationByConversation[conversationId]?.loadingMore && (
        <LoadMoreWrap><CircularProgress size={18} /></LoadMoreWrap>
      )}

      {paginationByConversation[conversationId]?.loading ? (
        <EmptyState>
          <CircularProgress size={28} />
          <EmptyDesc>{t("CHAT.LOADING_MESSAGES")}</EmptyDesc>
        </EmptyState>
      ) : messages.length === 0 && typingUsers.length === 0 ? (
        <EmptyState>
          <EmptyTitle>{t("CHAT.NO_MESSAGES")}</EmptyTitle>
          <EmptyDesc>{t("CHAT.START_CONVERSATION")}</EmptyDesc>
        </EmptyState>
      ) : (
        <MessagesContent>
          {messages.map((msg, index) => {
            const isSystem = msg.type === "system" || msg.message_type === "system";

            if (isSystem) {
              return (
                <Box key={msg.messageId} id={`msg-${msg.messageId}`}>
                  {shouldShowDateSeparator(msg, index) && (
                    <DateSeparator>
                      <DateLabel>{formatDateLabel(msg.createdAt)}</DateLabel>
                    </DateSeparator>
                  )}
                  <SystemMessageBanner message={msg} />
                </Box>
              );
            }

            const mine = msg.senderId === currentUserId;
            const grouping = getGroupingInfo(msg, index);
            const isLastMessage = index === messages.length - 1;

            return (
              <Box key={msg.messageId} id={`msg-${msg.messageId}`}>
                {shouldShowDateSeparator(msg, index) && (
                  <DateSeparator>
                    <DateLabel>{formatDateLabel(msg.createdAt)}</DateLabel>
                  </DateSeparator>
                )}
                <MessageItem
                  id={msg.messageId}
                  content={msg.isDeleted ? t("CHAT.MESSAGE_DELETED") : msg.body}
                  sender={
                    mine ? undefined : {
                      id: msg.senderId,
                      name: resolveSenderName(msg),
                      avatar: (() => {
                        if (isZaiBotMessage(msg)) {
                          return "https://res.cloudinary.com/dokskn4kz/image/upload/v1794724426/zalo-chat/zai_bot_avatar.png";
                        }
                        const member = members?.find((m) => m.userId === msg.senderId);
                        return resolveMediaUrl(member?.avatarUrl) || undefined;
                      })(),
                    }
                  }
                  timestamp={new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  isOwn={mine}
                  isDeleted={msg.isDeleted}
                  isPinned={isMessagePinned(msg.messageId)}
                  isEdited={Boolean(msg.editedAt)}
                  isGrouped={grouping.isGrouped}
                  isFirstInGroup={grouping.isFirstInGroup}
                  isMiddleInGroup={grouping.isMiddleInGroup}
                  isLastInGroup={grouping.isLastInGroup}
                  senderRole={memberRolesMap.get(msg.senderId)}
                  deliveryStatus="read"
                  replyTo={msg.replyTo || null}
                  attachments={msg.attachments}
                  reactions={reactionsForConv[msg.messageId] || []}
                  onReply={() => onReplyMessage(msg)}
                  onForward={() => onForwardMessage?.(msg.messageId, conversationId)}
                  onPin={canPinMessage ? () => pinMessage(conversationId, msg.messageId, msg.createdAt) : undefined}
                  onUnpin={canPinMessage ? () => unpinMessage(conversationId, msg.messageId, msg.createdAt) : undefined}
                  onEdit={(newContent) => onEditMessage?.(conversationId, msg.messageId, newContent, msg.createdAt)}
                  onReact={(emoji) => toggleReaction(conversationId, msg.messageId, msg.createdAt, emoji)}
                  onImageClick={(url, mediaList, index) => onImageClick?.(url, (mediaList || msg.attachments) as AttachmentDto[], index || 0)}
                  onDelete={() => onDeleteMessage(conversationId, msg.messageId)}
                  onDeleteForMe={() => deleteMessageForMe(conversationId, msg.messageId)}
                />

                {isLastMessage && mine && otherMembers.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      pr: 2,
                      mt: 0.5,
                      mb: 1,
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: "#64748B", fontWeight: 500, mr: 0.5 }}>
                      {t("CHAT.SEEN")}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {otherMembers.slice(0, 5).map((m: any, idx: number) => {
                        const mName = m.displayName || m.fullName || m.username || "Thành viên";
                        return (
                          <Tooltip key={m.userId || idx} title={mName}>
                            <Avatar
                              src={resolveMediaUrl(m.avatarUrl) || undefined}
                              sx={{
                                width: 16,
                                height: 16,
                                fontSize: 9,
                                border: "1.5px solid #FFFFFF",
                                ml: idx > 0 ? "-4px" : 0,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                                bgcolor: "#0068FF",
                                color: "#FFFFFF",
                              }}
                            >
                              {mName.charAt(0).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        );
                      })}
                      {otherMembers.length > 5 && (
                        <Typography sx={{ fontSize: 10, color: "#64748B", ml: 0.5, fontWeight: 600 }}>
                          +{otherMembers.length - 5}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}

          {typingUsers.map((user) => (
            <TypingBubble key={user.userId} user={user} isGroup={isGroup} />
          ))}
        </MessagesContent>
      )}
    </MessagesWrap>
  );
}
