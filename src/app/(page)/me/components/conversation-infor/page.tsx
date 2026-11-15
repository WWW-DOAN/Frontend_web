"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Box, IconButton, Typography, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { toast } from "react-toastify";

import { useChatStore } from "@/src/common/store/useChatStore";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import { chatService } from "@/src/common/service/chat-service";
import { friendService } from "@/src/common/service/friend-service";
import { AttachmentDto } from "@/src/common/interface/chat-interface";
import { MediaPreviewItem } from "@/src/common/components/MediaPreviewModal";
import MediaPreviewModal from "@/src/common/components/MediaPreviewModal";
import { useTrans } from "@/src/common/utilities/hook/trans";
import DangerZone from "./DangerZone";
import FileSection from "./FileSection";
import LinkSection from "./LinkSection";
import MediaSection from "./MediaSection";
import OverviewCard from "./OverviewCard";
import ProfileCard from "./ProfileCard";
import SecuritySection from "./SecuritySection";
import GroupMemberListView from "./GroupMemberListView";
import AddMemberGroupDialog from "./AddMemberGroupDialog";
import GroupSettingsDialog from "./GroupSettingsDialog";
import InviteLinkModal from "./InviteLinkModal";
import GroupBoardSection from "./GroupBoardSection";

interface InfConvColumnProps {
  conversationId: string;
  onClose?: () => void;
  onOpenCreatePoll?: () => void;
  onOpenCreateNote?: () => void;
  onOpenCreateReminder?: () => void;
  onOpenCreateTodo?: () => void;
  onViewPinned?: () => void;
  onViewPolls?: () => void;
}

const EMPTY_ATTACHMENTS: AttachmentDto[] = [];
const EMPTY_LINKS: string[] = [];
const EMPTY_MESSAGES: any[] = [];

const Root = styled(Box)({
  width: 380,
  minWidth: 380,
  height: "100%",
  background: "#F3F5F7",
  borderLeft: "1px solid #E5E7EB",
  overflowY: "auto",
});

const Header = styled(Box)({
  height: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px 0 20px",
  background: "#fff",
  borderBottom: "1px solid #E5E7EB",
  position: "sticky",
  top: 0,
  zIndex: 5,
});

const HeaderTitle = styled(Typography)({
  fontSize: 18,
  fontWeight: 700,
  color: "#0F172A",
});

export default function InfConvColumn({
  conversationId,
  onClose,
  onOpenCreatePoll,
  onOpenCreateNote,
  onOpenCreateReminder,
  onOpenCreateTodo,
  onViewPinned,
  onViewPolls,
}: InfConvColumnProps) {
  const t = useTrans();
  const [mounted, setMounted] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ open: boolean; mediaList: MediaPreviewItem[]; initialIndex: number }>({
    open: false,
    mediaList: [],
    initialIndex: 0,
  });
  const [friends, setFriends] = useState<Array<{ id: string; name: string; avatar?: string; phone?: string }>>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [pollsCount, setPollsCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const listConversation = useChatStore((s) => s.listConversation);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const fetchListConversation = useChatStore((s) => s.fetchListConversation);
  const currentUserId = useChatStore((s) => s.currentUserId);

  const conversation = listConversation.find((c) => c.id === activeConversationId);
  const isGroup = conversation?.type === "group" || conversation?.type === "GROUP";
  const members = conversation?.members ?? [];

  const currentUserMember = members.find((m: any) => m.userId === currentUserId);
  const currentUserRole = (currentUserMember as any)?.role;
  const isOwner = currentUserRole === "OWNER";
  const isAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const mediaItems = useChatStore(
    (state) => state.mediaByConversation?.[conversationId] ?? EMPTY_ATTACHMENTS
  );

  const fileItems = useChatStore(
    (state) => state.filesByConversation?.[conversationId] ?? EMPTY_ATTACHMENTS
  );

  const links = useChatStore(
    (state) => state.linksByConversation?.[conversationId] ?? EMPTY_LINKS
  );

  const pinnedMessages = useChatStore(
    (state) => state.pinnedMessagesByConversation?.[conversationId] ?? EMPTY_MESSAGES
  );

  const messages = useChatStore(
    (state) => state.messagesByConversation?.[conversationId] ?? EMPTY_MESSAGES
  );

  const remindersCount = useMemo(() => {
    return (Array.isArray(messages) ? messages : []).filter((m) =>
      Array.isArray(m?.attachments) && m.attachments.some((a: any) => a?.type === "reminder")
    ).length;
  }, [messages]);

  const notesCount = useMemo(() => {
    return (Array.isArray(messages) ? messages : []).filter((m) =>
      Array.isArray(m?.attachments) && m.attachments.some((a: any) => a?.type === "note")
    ).length;
  }, [messages]);

  const todosCount = useMemo(() => {
    return (Array.isArray(messages) ? messages : []).filter((m) =>
      Array.isArray(m?.attachments) && m.attachments.some((a: any) => a?.type === "todo")
    ).length;
  }, [messages]);

  useEffect(() => {
    if (isGroup && conversationId) {
      chatService
        .getPolls(conversationId)
        .then((res: any) => {
          const list = res?.payload?.data || res?.data || res || [];
          if (Array.isArray(list)) {
            setPollsCount(list.length);
          }
        })
        .catch(() => {});
    }
  }, [conversationId, isGroup]);

  const handleOpenPoll = () => {
    if (onOpenCreatePoll) onOpenCreatePoll();
    else window.dispatchEvent(new CustomEvent("chat:open_modal", { detail: "poll" }));
  };

  const handleOpenNote = () => {
    if (onOpenCreateNote) onOpenCreateNote();
    else window.dispatchEvent(new CustomEvent("chat:open_modal", { detail: "note" }));
  };

  const handleOpenReminder = () => {
    if (onOpenCreateReminder) onOpenCreateReminder();
    else window.dispatchEvent(new CustomEvent("chat:open_modal", { detail: "reminder" }));
  };

  const handleOpenTodo = () => {
    if (onOpenCreateTodo) onOpenCreateTodo();
    else window.dispatchEvent(new CustomEvent("chat:open_modal", { detail: "todo" }));
  };

  const handleViewPinned = () => {
    if (onViewPinned) onViewPinned();
    else window.dispatchEvent(new CustomEvent("chat:scroll_to_pinned"));
  };

  const handleViewPolls = () => {
    if (onViewPolls) onViewPolls();
    else window.dispatchEvent(new CustomEvent("chat:open_modal", { detail: "view_polls" }));
  };

  const refresh = () => fetchListConversation({ page: 1, limit: 20 });

  const loadFriends = useCallback(async () => {
    try {
      const res: any = await friendService.getFriends();
      console.log('[loadFriends] Raw response:', res);
      
      const payload = res?.payload;
      const friendList: any[] = payload?.data ?? [];
      console.log('[loadFriends] Friend list:', friendList);
      
      const existingIds = new Set(members.map((m: any) => m.userId));
      const available = friendList
        .filter((f: any) => !existingIds.has(f.id))
        .map((f: any) => ({
          id: f.id,
          name: f.displayName || f.username || f.id,
          avatar: f.avatarUrl || undefined,
          phone: f.phone || undefined,
        }));
      console.log('[loadFriends] Available friends:', available);
      setFriends(available);
    } catch (err) {
      console.error('[loadFriends] Error:', err);
    }
  }, [members]);

  const handleOpenAddMember = () => {
    loadFriends();
    setShowAddMember(true);
  };

  const handleAddMember = async (userId: string) => {
    const friend = friends.find((f) => f.id === userId);
    try {
      await chatService.addMembers(conversationId, { memberIds: [userId] });
      toast.success(`Đã thêm "${friend?.name || userId}" vào nhóm`);
      setFriends((prev) => prev.filter((f) => f.id !== userId));
      await refresh();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || "Không thể thêm thành viên";
      toast.error(message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find((m: any) => m.userId === memberId);
    const memberName = member?.displayName || member?.username || memberId;
    try {
      await chatService.removeMember(conversationId, memberId);
      toast.success(`Đã xóa "${memberName}" khỏi nhóm`);
      await refresh();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || "Không thể xóa thành viên";
      toast.error(message);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setActiveConversationId(null);
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    const member = members.find((m: any) => m.userId === memberId);
    const memberName = member?.displayName || member?.username || memberId;
    try {
      await chatService.updateMemberRole(conversationId, memberId, 'ADMIN');
      toast.success(`Đã phong "${memberName}" làm quản trị viên`);
      await refresh();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || "Không thể phong quản trị viên";
      toast.error(message);
    }
  };

  const handleDemoteFromAdmin = async (memberId: string) => {
    const member = members.find((m: any) => m.userId === memberId);
    const memberName = member?.displayName || member?.username || memberId;
    try {
      await chatService.updateMemberRole(conversationId, memberId, 'MEMBER');
      toast.success(`Đã hạ quyền "${memberName}" xuống thành viên`);
      await refresh();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || "Không thể hạ quyền quản trị viên";
      toast.error(message);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    const newOwner = members.find((m: any) => m.userId === newOwnerId);
    const newOwnerName = newOwner?.displayName || newOwner?.username || newOwnerId;
    try {
      await chatService.transferOwnership(conversationId, newOwnerId);
      toast.success(`Đã chuyển quyền trưởng nhóm cho "${newOwnerName}"`);
      await refresh();
    } catch (error: any) {
      const message = error?.message || error?.response?.data?.message || "Không thể chuyển quyền";
      toast.error(message);
    }
  };

  if (!conversationId) return null;

  if (!mounted) {
    return (
      <Root>
        <Header>
          <HeaderTitle>{isGroup ? t("COMMON.CONVO_INFO_GROUP") : t("COMMON.CONVO_INFO_CHAT")}</HeaderTitle>
          <Box />
        </Header>
      </Root>
    );
  }

  return (
    <Root>
      <Header>
        <HeaderTitle>{isGroup ? t("COMMON.CONVO_INFO_GROUP") : t("COMMON.CONVO_INFO_CHAT")}</HeaderTitle>
        <IconButton size="small" onClick={handleClose}>
          <CloseRoundedIcon />
        </IconButton>
      </Header>

      <ProfileCard onAddMember={isGroup ? handleOpenAddMember : undefined} />
      <OverviewCard />

      {isGroup && (
        <GroupBoardSection
          pinnedCount={pinnedMessages.length}
          pollsCount={pollsCount}
          notesCount={notesCount}
          remindersCount={remindersCount}
          todosCount={todosCount}
          onOpenCreatePoll={handleOpenPoll}
          onOpenCreateNote={handleOpenNote}
          onOpenCreateReminder={handleOpenReminder}
          onOpenCreateTodo={handleOpenTodo}
          onViewPinned={handleViewPinned}
          onViewPolls={handleViewPolls}
        />
      )}

      {isGroup && (
        <Box sx={{ px: 2, pb: 1, pt: 0.5 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(0, 90, 224, 0.06))",
              border: "1px solid rgba(124, 58, 237, 0.18)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.8 }}>
              <AutoAwesomeIcon sx={{ fontSize: 18, color: "#7C3AED" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#4F46E5", fontSize: 13 }}>
                Trợ lý ZAi trong nhóm
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 1 }}>
              Gõ @ZAi trong ô chat hoặc chọn nhanh tác vụ bên dưới:
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("chat:insert_mention", {
                      detail: { text: "@ZAi tóm tắt đoạn chat gần đây" },
                    })
                  );
                }}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.5,
                  px: 1.2,
                  borderColor: "#DDD6FE",
                  color: "#6D28D9",
                  bgcolor: "#fff",
                  "&:hover": { bgcolor: "#F5F3FF", borderColor: "#C4B5FD" },
                }}
              >
                📋 Tóm tắt cuộc trò chuyện
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("chat:insert_mention", {
                      detail: { text: "@ZAi tóm tắt các việc cần làm và quyết định" },
                    })
                  );
                }}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.5,
                  px: 1.2,
                  borderColor: "#DDD6FE",
                  color: "#6D28D9",
                  bgcolor: "#fff",
                  "&:hover": { bgcolor: "#F5F3FF", borderColor: "#C4B5FD" },
                }}
              >
                📌 Tổng hợp việc cần làm (To-Do)
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("chat:insert_mention", {
                      detail: { text: "@ZAi " },
                    })
                  );
                }}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.5,
                  px: 1.2,
                  borderColor: "#DDD6FE",
                  color: "#6D28D9",
                  bgcolor: "#fff",
                  "&:hover": { bgcolor: "#F5F3FF", borderColor: "#C4B5FD" },
                }}
              >
                ❓ Hỏi đáp cùng ZAi
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {isGroup && (
        (conversation?.settings?.policies as any)?.hideMemberList && !isAdmin ? (
          <Box sx={{ p: 2, textAlign: "center", bgcolor: "#fff", m: 1, borderRadius: 2, border: "1px solid #E5E7EB" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.8 }}>
              <LockOutlinedIcon sx={{ fontSize: 16, color: "#64748B" }} />
              <Typography variant="body2" color="text.secondary">
                Danh sách thành viên đã bị ẩn bởi Quản trị viên
              </Typography>
            </Box>
          </Box>
        ) : (
          <GroupMemberListView
            members={members.map((m: any) => ({
              id: m.userId,
              name: m.displayName || m.username || m.userId,
              avatar: resolveMediaUrl(m.avatarUrl) || undefined,
              isOwner: m.role === "OWNER",
              isAdmin: m.role === "OWNER" || m.role === "ADMIN",
            }))}
            totalCount={members.length > 0 ? members.length : (conversation?.memberCount ?? 0)}
            searchValue={memberSearch}
            onSearch={setMemberSearch}
            onRemoveMember={handleRemoveMember}
            onAddMember={handleOpenAddMember}
            onPromoteToAdmin={handlePromoteToAdmin}
            onDemoteFromAdmin={handleDemoteFromAdmin}
            onTransferOwnership={handleTransferOwnership}
            canManageMembers={isAdmin}
            canPromote={isOwner}
          />
        )
      )}

      {isGroup && isAdmin && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box
            component="button"
            onClick={() => setShowGroupSettings(true)}
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              py: 1,
              px: 2,
              borderRadius: "8px",
              bgcolor: "#fff",
              border: "1px solid #E5E7EB",
              color: "#374151",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { bgcolor: "#F9FAFB", borderColor: "#D1D5DB" },
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
            Quản trị & Cài đặt nhóm
          </Box>
        </Box>
      )}

      {isGroup && isAdmin && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box
            component="button"
            onClick={() => setShowInviteLink(true)}
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              py: 1,
              px: 2,
              borderRadius: "8px",
              bgcolor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              color: "#1D4ED8",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { bgcolor: "#DBEAFE" },
            }}
          >
            <LinkRoundedIcon sx={{ fontSize: 18 }} />
            Mời vào nhóm bằng liên kết
          </Box>
        </Box>
      )}

      {isGroup && (
        <GroupSettingsDialog
          open={showGroupSettings}
          conversationId={conversationId || activeConversationId || conversation?.id || ""}
          onClose={() => setShowGroupSettings(false)}
          isAdmin={isAdmin}
        />
      )}

      {isGroup && isAdmin && (
        <InviteLinkModal
          open={showInviteLink}
          conversationId={conversationId || activeConversationId || conversation?.id || ""}
          onClose={() => setShowInviteLink(false)}
        />
      )}

      {isGroup && (
        <AddMemberGroupDialog
          open={showAddMember}
          friends={friends}
          onClose={() => setShowAddMember(false)}
          onAddMember={handleAddMember}
        />
      )}

      <MediaSection
        items={mediaItems}
        onMediaClick={(url, mediaList, index) => {
          const items: MediaPreviewItem[] = mediaList.map((att) => ({
            key: att.url || att.thumbnailUrl || att.key || "",
            name: att.name || "media",
            type: att.type || "image",
          }));
          setMediaPreview({ open: true, mediaList: items, initialIndex: index });
        }}
      />
      <FileSection items={fileItems} />
      <LinkSection items={links} />
      <SecuritySection />
      <DangerZone conversationId={conversationId} />

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
