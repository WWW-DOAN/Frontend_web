"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { Box, Typography, Collapse, IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import PollItem from "./PollItem";
import CreatePollModal from "./CreatePollModal";
import EditPollModal from "./EditPollModal";
import ShareContactModal from "./ShareContactModal";
import CreateReminderModal from "./CreateReminderModal";
import CreateNoteModal from "./CreateNoteModal";
import CreateTodoModal from "./CreateTodoModal";
import { chatService } from "@/src/common/service/chat-service";
import { ConversationPoll } from "@/src/common/interface/conversation-interface";
import { useChatStore } from "@/src/common/store/useChatStore";
import {
  deleteMessage,
  editMessage,
  initChat,
  loadMoreMessages,
  openConversation,
  pinMessage,
  sendMessage,
  unpinMessage,
} from "@/src/common/action/chat.action";
import { UiMessage, AttachmentDto } from "@/src/common/interface/chat-interface";
import { ChatAttachmentPayload } from "@/src/common/interface/media-interface";
import PinnedMessageBarComponent from "./PinnedMessageBar";
import ForwardMessageDialog from "./ForwardMessageDialog";
import MediaPreviewModal from "@/src/common/components/MediaPreviewModal";
import { MediaPreviewItem } from "@/src/common/components/MediaPreviewModal";
import TypingIndicator from "./TypingIndicator";
import { useTrans } from "@/src/common/utilities/hook/trans";

interface ChatPanelProps {
  accessToken: string;
  currentUserId: string;
  conversationId: string;
  title?: string;
  onToggleSearch?: () => void;
  onToggleInfo?: () => void;
  onBackClick?: () => void;
}

const Root = styled(Box)({
  width: "100%",
  height: "100%",
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
});

const HeaderWrap = styled(Box)({
  height: 70,
  minHeight: 70,
  maxHeight: 70,
  flexShrink: 0,
  borderBottom: "1px solid #E5E7EB",
});

const MessageListWrap = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
});

const InputWrap = styled(Box)({
  minHeight: 50,
  flexShrink: 0,
});

export default function ChatPanel({
  accessToken,
  currentUserId,
  conversationId,
  title,
  onToggleSearch,
  onToggleInfo,
  onBackClick,
}: ChatPanelProps) {
  const t = useTrans();
  const listRef = useRef<HTMLDivElement | null>(null);

  const isAutoScrollingRef = useRef(false);
  const scrollHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevConversationIdRef = useRef<string | null>(null);
  const prevFirstMessageIdRef = useRef<string | null>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);

  const isLoadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);

  const scrollIntentRef = useRef<"none" | "open" | "load-more">("none");

  const [showScrollbar, setShowScrollbar] = useState(false);
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null);
  const [replyMessageData, setReplyMessageData] = useState<{ messageId: string; body: string; senderName?: string } | null>(null);
  const [forwardTarget, setForwardTarget] = useState<{ messageId: string; conversationId: string } | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ open: boolean; mediaList: MediaPreviewItem[]; initialIndex: number }>({
    open: false,
    mediaList: [],
    initialIndex: 0,
  });

  const [polls, setPolls] = useState<ConversationPoll[]>([]);
  const [showPollsList, setShowPollsList] = useState(false);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [editingPoll, setEditingPoll] = useState<ConversationPoll | null>(null);
  const [showShareContactModal, setShowShareContactModal] = useState(false);
  const [showCreateReminderModal, setShowCreateReminderModal] = useState(false);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showCreateTodoModal, setShowCreateTodoModal] = useState(false);

  const {
    socketConnected,
    messagesByConversation,
    paginationByConversation,
    pinnedMessagesByConversation,
    typingUsersByConversation,
    listConversation,
    error,
  } = useChatStore();

  const conversation = useMemo(
    () => listConversation.find((c) => c.id === conversationId),
    [listConversation, conversationId]
  );
  const isGroup = conversation?.type === "group" || conversation?.type === "GROUP";
  const members = (conversation?.members || []) as any[];

  const fetchPolls = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await chatService.getPolls(conversationId);
      const list = res?.data?.data || res?.data || [];
      setPolls(Array.isArray(list) ? list : []);
    } catch {
      // silently ignore
    }
  }, [conversationId]);

  useEffect(() => {
    if (isGroup) {
      fetchPolls();
    } else {
      setPolls([]);
      setShowPollsList(false);
    }
  }, [conversationId, isGroup, fetchPolls]);

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const modalType = (e as CustomEvent).detail;
      if (modalType === "poll") setShowCreatePollModal(true);
      else if (modalType === "note") setShowCreateNoteModal(true);
      else if (modalType === "reminder") setShowCreateReminderModal(true);
      else if (modalType === "todo") setShowCreateTodoModal(true);
      else if (modalType === "contact") setShowShareContactModal(true);
      else if (modalType === "view_polls") setShowPollsList(true);
    };
    window.addEventListener("chat:open_modal", handleOpenModal);
    return () => window.removeEventListener("chat:open_modal", handleOpenModal);
  }, []);

  const handleShareContact = (contact: { userId: string; displayName: string; avatarUrl?: string; phone?: string }) => {
    const contactAttachment: ChatAttachmentPayload = {
      key: contact.userId,
      name: contact.displayName,
      url: contact.avatarUrl,
      size: contact.phone ? Number(contact.phone.replace(/\D/g, "")) : 0,
      type: "contact",
      contentType: "application/contact",
      content_type: "application/contact",
      visibility: "public",
    };
    sendMessage(conversationId, `[Danh thiếp] ${contact.displayName}`, [contactAttachment]);
  };

  const messages = useMemo(
    () => messagesByConversation[conversationId] || [],
    [messagesByConversation, conversationId]
  );

  const pagination = paginationByConversation[conversationId];
  const loadingMore = pagination?.loadingMore;
  const loading = pagination?.loading;

  const pinnedMessages = useMemo(
    () => pinnedMessagesByConversation[conversationId] || [],
    [pinnedMessagesByConversation, conversationId]
  );

  useEffect(() => {
    const handleScrollPinned = () => {
      if (pinnedMessages.length > 0) {
        const firstPinned = pinnedMessages[0];
        const el = document.getElementById(`msg-${firstPinned.messageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.backgroundColor = "#FEF3C7";
          setTimeout(() => {
            el.style.backgroundColor = "";
          }, 2000);
        }
      }
    };
    window.addEventListener("chat:scroll_to_pinned", handleScrollPinned);
    return () => window.removeEventListener("chat:scroll_to_pinned", handleScrollPinned);
  }, [pinnedMessages]);

  const firstMessageId = messages[0]?.messageId ?? null;
  const lastMessageId = messages[messages.length - 1]?.messageId ?? null;

  const scrollToBottomStable = () => {
    const wrap = listRef.current;
    if (!wrap) return;
    isAutoScrollingRef.current = true;

    requestAnimationFrame(() => {
      const node1 = listRef.current;
      if (!node1) {
        isAutoScrollingRef.current = false;
        return;
      }

      node1.scrollTop = node1.scrollHeight;

      requestAnimationFrame(() => {
        const node2 = listRef.current;
        if (!node2) {
          isAutoScrollingRef.current = false;
          return;
        }

        node2.scrollTop = node2.scrollHeight;

        requestAnimationFrame(() => {
          isAutoScrollingRef.current = false;
        });
      });
    });
  };

  const tryLoadMore = async () => {
    const wrap = listRef.current;
    if (!wrap || !conversationId || loading || loadingMore || !pagination?.hasMore) {
      return;
    }
    prevScrollHeightRef.current = wrap.scrollHeight;
    isLoadingMoreRef.current = true;
    scrollIntentRef.current = "load-more";
    await loadMoreMessages(conversationId);
  };

  const handleScroll = () => {
    if (isAutoScrollingRef.current) return;
    const wrap = listRef.current;
    if (!wrap) return;

    setShowScrollbar(true);
    if (scrollHideTimeoutRef.current) clearTimeout(scrollHideTimeoutRef.current);
    scrollHideTimeoutRef.current = setTimeout(() => setShowScrollbar(false), 800);

    if (scrollIntentRef.current === "none" && wrap.scrollTop <= 80) {
      void tryLoadMore();
    }
  };
  const handleReplyMessage = (msg: UiMessage) => {
    setReplyMessageId(msg.messageId);
    setReplyMessageData({
      messageId: msg.messageId,
      body: msg.body || "",
      senderName: msg.senderName,
    });
  };
  
  const handleCancelReply = () => {
    setReplyMessageId(null);
    setReplyMessageData(null);
  };
  useEffect(() => {
    if (!accessToken || !currentUserId) return;
    initChat(accessToken, currentUserId);
  }, [accessToken, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;
    prevConversationIdRef.current = conversationId;
    scrollIntentRef.current = "open";
    isLoadingMoreRef.current = false;
    prevScrollHeightRef.current = 0;
    prevFirstMessageIdRef.current = null;
    prevLastMessageIdRef.current = null;

    openConversation(conversationId);
  }, [conversationId]);

  useLayoutEffect(() => {
    const wrap = listRef.current;
    if (!wrap) return;

    const intent = scrollIntentRef.current;
    // Case 1: Vào conversation / đổi conversation
    if (intent === "open" && !loading && !loadingMore && messages.length > 0) {
      console.log("[layoutEffect:open -> scroll bottom]");
      scrollToBottomStable();
      scrollIntentRef.current = "none";
      prevFirstMessageIdRef.current = firstMessageId;
      prevLastMessageIdRef.current = lastMessageId;
      return;
    }

    // Case 2: Load more xong -> giữ vị trí đọc
    if (intent === "load-more" && !loadingMore) {
      console.log("[layoutEffect:load-more -> keep current position]", {
        scrollTopCurrent: wrap.scrollTop,
        scrollHeightCurrent: wrap.scrollHeight,
      });

      isLoadingMoreRef.current = false;
      scrollIntentRef.current = "none";

      prevFirstMessageIdRef.current = firstMessageId;
      prevLastMessageIdRef.current = lastMessageId;
      return;
    }
    // Case 3: Tin nhắn mới append (intent = "none", lastMessageId thay đổi)
    if (intent === "none" && !isLoadingMoreRef.current) {
      const prevLastMessageId = prevLastMessageIdRef.current;
      const isAppendedNewMessage =
        !!prevLastMessageId &&
        !!lastMessageId &&
        prevLastMessageId !== lastMessageId;

      if (isAppendedNewMessage && !loading && !loadingMore) {
        requestAnimationFrame(() => scrollToBottomStable());
      }

      prevFirstMessageIdRef.current = firstMessageId;
      prevLastMessageIdRef.current = lastMessageId;
    }
  }, [conversationId, messages, firstMessageId, lastMessageId, loading, loadingMore]);
  useEffect(() => {
    return () => {
      if (scrollHideTimeoutRef.current) {
        clearTimeout(scrollHideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Root>
      <HeaderWrap>
        <ChatHeader
          conversationId={conversationId}
          socketConnected={socketConnected}
          error={error}
          onToggleSearch={onToggleSearch}
          onToggleInfo={onToggleInfo}
          onBackClick={onBackClick}
        />
      </HeaderWrap>

      {pinnedMessages.length > 0 && (
        <PinnedMessageBarComponent
          messages={pinnedMessages.map((m: any) => {
            const nestedMsg = m.message;
            return {
              messageId: m.messageId || m.id,
              body: nestedMsg?.body || m.body || m.content || "",
              content: nestedMsg?.body || m.body || m.content || "",
              senderId: nestedMsg?.senderId || m.senderId,
              senderName: m.senderName || "",
              createdAt: nestedMsg?.createdAt || m.createdAt,
              attachments: nestedMsg?.attachments || m.attachments || [],
              pinnedBy: m.pinnedBy,
              pinnedAt: m.pinnedAt ? new Date(m.pinnedAt).getTime() : undefined,
              timestamp: (nestedMsg?.createdAt || m.createdAt)
                ? new Date(nestedMsg?.createdAt || m.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            };
          })}
          currentUserId={currentUserId}
          onUnpin={(messageId) => {
            const msg = pinnedMessages.find(
              (m: any) => m.messageId === messageId || m.id === messageId
            );
            if (msg) {
              unpinMessage(conversationId, messageId, msg.createdAt ?? Date.now());
            }
          }}
          onMessageClick={(messageId) => {
            const element = document.getElementById(`msg-${messageId}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
              element.style.transition = "background-color 0.3s ease";
              element.style.backgroundColor = "#FFF3CD";
              setTimeout(() => {
                element.style.backgroundColor = "transparent";
              }, 1500);
            }
          }}
        />
      )}

      {isGroup && polls.length > 0 && (
        <Box sx={{ borderBottom: "1px solid #E5E7EB", bgcolor: "#F8FAFC" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1,
              cursor: "pointer",
              "&:hover": { bgcolor: "#F1F5F9" },
            }}
            onClick={() => setShowPollsList((prev) => !prev)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PollOutlinedIcon sx={{ fontSize: 18, color: "#005AE0" }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                Bình chọn nhóm ({polls.filter((p) => p.status === "OPEN").length} đang mở)
              </Typography>
            </Box>
            <IconButton size="small">
              {showPollsList ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Collapse in={showPollsList}>
            <Box sx={{ px: 2, pb: 2, maxHeight: 320, overflowY: "auto" }}>
              {polls.map((poll) => (
                <PollItem
                  key={poll.id}
                  poll={poll}
                  conversationId={conversationId}
                  onVote={fetchPolls}
                  onWithdraw={fetchPolls}
                  onClose={fetchPolls}
                  onEdit={() => setEditingPoll(poll)}
                  onDelete={fetchPolls}
                />
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      <MessageListWrap>
        <MessageList
          listRef={listRef}
          messages={messages}
          onReplyMessage={handleReplyMessage}
          currentUserId={currentUserId}
          conversationId={conversationId}
          pagination={pagination}
          onLoadMore={loadMoreMessages}
          onDeleteMessage={(conversationId, messageId) => { const msg = messages.find((m) => m.messageId === messageId); return deleteMessage(conversationId, messageId, msg?.createdAt ?? Date.now()); }}
          onScroll={handleScroll}
          showScrollbar={showScrollbar}
          onForwardMessage={(msgId, convId) => setForwardTarget({ messageId: msgId, conversationId: convId })}
          onEditMessage={editMessage}
          onImageClick={(url, mediaList, index) => {
            const items: MediaPreviewItem[] = (mediaList || []).map((att) => {
              const contentType = (att.contentType || (att as any).content_type || "").toLowerCase();
              const isVideo = att.type?.toLowerCase() === "video" || contentType.startsWith("video/");
              return {
                key: att.url || att.thumbnailUrl || att.key || "",
                name: att.name || t("CHAT.FILE"),
                type: isVideo ? "video" : "image",
              };
            });
            if (items.length > 0) {
              setMediaPreview({ open: true, mediaList: items, initialIndex: index || 0 });
            } else if (url) {
              const isVideoUrl = url.toLowerCase().endsWith(".mp4") || url.toLowerCase().endsWith(".webm");
              setMediaPreview({
                open: true,
                mediaList: [{ key: url, name: t("CHAT.FILE"), type: isVideoUrl ? "video" : "image" }],
                initialIndex: 0,
              });
            }
          }}
        />
      </MessageListWrap>

      {typingUsersByConversation[conversationId]?.length > 0 && (
        <TypingIndicator
          names={typingUsersByConversation[conversationId]
            .slice(0, 2)
            .map((u) => u.displayName || t("CHAT.SOMEONE"))}
          count={typingUsersByConversation[conversationId].length}
        />
      )}

      <InputWrap>
        <ChatInput
          disabled={false}
          conversationId={conversationId}
          isGroup={isGroup}
          onOpenCreatePoll={() => setShowCreatePollModal(true)}
          onOpenShareContact={() => setShowShareContactModal(true)}
          onOpenCreateReminder={() => setShowCreateReminderModal(true)}
          onOpenCreateNote={() => setShowCreateNoteModal(true)}
          onOpenCreateTodo={() => setShowCreateTodoModal(true)}
          onSend={(text, attachments) => {
            const replyMsg = messages.find((m) => m.messageId === replyMessageId);
            sendMessage(conversationId, text, attachments, replyMsg);
            handleCancelReply();
          }}
          replyMessage={replyMessageData}
          onCancelReply={handleCancelReply}
        />
      </InputWrap>

      {forwardTarget && (
        <ForwardMessageDialog
          open={true}
          onClose={() => setForwardTarget(null)}
          messageId={forwardTarget.messageId}
          conversationId={forwardTarget.conversationId}
        />
      )}

      <CreatePollModal
        open={showCreatePollModal}
        conversationId={conversationId}
        onClose={() => setShowCreatePollModal(false)}
        onCreated={fetchPolls}
      />

      <EditPollModal
        open={Boolean(editingPoll)}
        poll={editingPoll}
        conversationId={conversationId}
        onClose={() => setEditingPoll(null)}
        onUpdated={fetchPolls}
      />

      <ShareContactModal
        open={showShareContactModal}
        onClose={() => setShowShareContactModal(false)}
        onShare={handleShareContact}
      />

      <CreateReminderModal
        open={showCreateReminderModal}
        onClose={() => setShowCreateReminderModal(false)}
        onCreated={async (content, attachments, pin = true) => {
          const sent: any = await sendMessage(conversationId, content, attachments);
          if (pin && sent?.messageId && sent?.createdAt) {
            await pinMessage(conversationId, sent.messageId, sent.createdAt);
          }
        }}
      />

      <CreateNoteModal
        open={showCreateNoteModal}
        onClose={() => setShowCreateNoteModal(false)}
        onCreated={async (content, attachments, pin = true) => {
          const sent: any = await sendMessage(conversationId, content, attachments);
          if (pin && sent?.messageId && sent?.createdAt) {
            await pinMessage(conversationId, sent.messageId, sent.createdAt);
          }
        }}
      />

      <CreateTodoModal
        open={showCreateTodoModal}
        members={members}
        onClose={() => setShowCreateTodoModal(false)}
        onCreated={(content, attachments) => {
          sendMessage(conversationId, content, attachments);
        }}
      />

      <MediaPreviewModal
        open={mediaPreview.open}
        media={mediaPreview.mediaList[0] || null}
        mediaList={mediaPreview.mediaList}
        initialIndex={mediaPreview.initialIndex}
        onClose={() => setMediaPreview({ open: false, mediaList: [], initialIndex: 0 })}
      />

    </Root>
  );
}
