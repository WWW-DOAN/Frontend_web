"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";

import { chatService } from "@/src/common/service/chat-service";
import { useChatStore } from "@/src/common/store/useChatStore";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import type { GroupJoinRequestDto } from "@/src/common/interface/chat-interface";

interface GroupSettingsDialogProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  isAdmin: boolean;
}

type Permissions = {
  canSendMessage: boolean;
  canSendMedia: boolean;
  canCreatePolls: boolean;
  canPinMessage: boolean;
  canUpdateGroupInfo: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canStartCall: boolean;
};

type Policies = {
  maxMembers: number;
  inviteApproval: boolean;
  allowJoinViaLink: boolean;
  allowViewPastMessages: boolean;
  hideMemberList: boolean;
  messageRetention: number;
};

type Features = {
  polls: boolean;
  calls: boolean;
  fileSharing: boolean;
  reactions: boolean;
};

interface GroupSettingsState {
  permissions: Permissions;
  policies: Policies;
  features: Features;
}

const DEFAULT_SETTINGS: GroupSettingsState = {
  permissions: {
    canSendMessage: true,
    canSendMedia: true,
    canCreatePolls: true,
    canPinMessage: true,
    canUpdateGroupInfo: false,
    canAddMembers: true,
    canRemoveMembers: true,
    canStartCall: true,
  },
  policies: {
    maxMembers: 100,
    inviteApproval: false,
    allowJoinViaLink: true,
    allowViewPastMessages: true,
    hideMemberList: false,
    messageRetention: 0,
  },
  features: {
    polls: true,
    calls: true,
    fileSharing: true,
    reactions: true,
  },
};

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 16,
    maxWidth: 720,
    width: "100%",
    maxHeight: "88vh",
    overflow: "hidden",
  },
});

const SectionCard = styled(Box)({
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  background: "#FFFFFF",
  overflow: "hidden",
});

const SectionHeader = styled(Box)({
  padding: "10px 16px",
  background: "#F9FAFB",
  borderBottom: "1px solid #E5E7EB",
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const SettingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "12px 16px",
});

const unwrap = (res: any) => res?.payload?.data ?? res?.payload ?? res?.data ?? res;

function readSettings(source: any): GroupSettingsState | null {
  const raw = source?.settings ?? source;
  if (!raw || (!raw.permissions && !raw.policies && !raw.features)) return null;
  return {
    permissions: { ...DEFAULT_SETTINGS.permissions, ...(raw.permissions ?? {}) },
    policies: { ...DEFAULT_SETTINGS.policies, ...(raw.policies ?? {}) },
    features: { ...DEFAULT_SETTINGS.features, ...(raw.features ?? {}) },
  };
}

function formatRequestTime(value: string | number | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

interface SwitchRowProps {
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: (checked: boolean) => void;
}

function SwitchRow({
  icon,
  iconBg = "#EFF6FF",
  iconColor = "#0068FF",
  title,
  description,
  checked,
  disabled,
  loading,
  onChange,
}: SwitchRowProps) {
  return (
    <SettingRow>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pr: 2, minWidth: 0 }}>
        {icon && (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: iconBg,
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              mt: 0.2,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</Typography>
          <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.25, lineHeight: 1.5 }}>
            {description}
          </Typography>
        </Box>
      </Box>
      {loading ? (
        <CircularProgress size={20} sx={{ mr: 1.5, flexShrink: 0 }} />
      ) : (
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          color="primary"
          sx={{ flexShrink: 0 }}
        />
      )}
    </SettingRow>
  );
}

export default function GroupSettingsDialog({
  open,
  conversationId,
  onClose,
  isAdmin,
}: GroupSettingsDialogProps) {
  const listConversation = useChatStore((s) => s.listConversation);
  const conversationDetail = useChatStore((s) => s.conversationDetailById?.[conversationId]);
  const fetchListConversation = useChatStore((s) => s.fetchListConversation);
  const fetchConversationDetail = useChatStore((s) => s.fetchConversationDetail);
  const currentUserId = useChatStore((s) => s.currentUserId);

  const conversation = listConversation.find((c) => c.id === conversationId);
  const members = useMemo(
    () => (conversationDetail?.members?.length ? conversationDetail.members : conversation?.members) ?? [],
    [conversationDetail?.members, conversation?.members]
  );

  const currentMember = members.find((m: any) => m.userId === currentUserId);
  const currentRole = (currentMember as any)?.role;
  const isOwner = currentRole === "OWNER";
  const canManage = isAdmin || isOwner || currentRole === "ADMIN";

  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<GroupSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [inviteLink, setInviteLink] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [resettingLink, setResettingLink] = useState(false);

  const [requests, setRequests] = useState<GroupJoinRequestDto[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const [roleActionId, setRoleActionId] = useState<string | null>(null);
  const [confirmDisband, setConfirmDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  const roleLabel = isOwner ? "Trưởng nhóm" : canManage ? "Phó nhóm" : "Thành viên";
  const roleIcon = isOwner ? (
    <WorkspacePremiumRoundedIcon sx={{ fontSize: "16px !important", color: "#B45309 !important" }} />
  ) : canManage ? (
    <VerifiedUserRoundedIcon sx={{ fontSize: "16px !important", color: "#0369A1 !important" }} />
  ) : (
    <PersonOutlineRoundedIcon sx={{ fontSize: "16px !important", color: "#4B5563 !important" }} />
  );

  const loadSettings = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await chatService.getGroupSettings(conversationId);
      const parsed = readSettings(unwrap(res));
      if (parsed) setSettings(parsed);
    } catch (err) {
      console.warn("[GroupSettingsDialog] getGroupSettings failed:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const loadInviteLink = useCallback(async () => {
    if (!conversationId) return;
    setInviteLoading(true);
    try {
      const res = await chatService.getGroupInviteLink(conversationId);
      const data = unwrap(res);
      const code = data?.inviteCode ?? data?.code ?? "";
      const rawLink = data?.inviteLink ?? (code ? `/join-group/${code}` : "");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = rawLink
        ? rawLink.startsWith("http")
          ? rawLink
          : `${origin}${rawLink.startsWith("/") ? rawLink : `/${rawLink}`}`
        : "";
      setInviteLink(link);
    } catch (err) {
      console.warn("[GroupSettingsDialog] getGroupInviteLink failed:", err);
    } finally {
      setInviteLoading(false);
    }
  }, [conversationId]);

  const loadRequests = useCallback(async () => {
    if (!conversationId || !canManage) {
      setRequests([]);
      return;
    }
    setRequestsLoading(true);
    try {
      const res = await chatService.getJoinRequests(conversationId);
      const data = unwrap(res);
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("[GroupSettingsDialog] getJoinRequests failed:", err);
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [conversationId, canManage]);

  useEffect(() => {
    if (!open || !conversationId) return;
    setTab(0);
    setConfirmDisband(false);
    fetchConversationDetail(conversationId, true).catch(() => {});
    loadSettings();
    loadInviteLink();
    loadRequests();
  }, [open, conversationId, fetchConversationDetail, loadSettings, loadInviteLink, loadRequests]);

  // Đồng bộ realtime: thành viên khác đổi cài đặt
  useEffect(() => {
    if (!open) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.conversationId && detail.conversationId !== conversationId) return;
      const parsed = readSettings(detail?.settings);
      if (parsed) setSettings(parsed);
      else loadSettings();
      loadRequests();
    };
    const joinHandler = () => loadRequests();
    window.addEventListener("chat:group-settings-updated", handler);
    window.addEventListener("chat:join-request-created", joinHandler);
    return () => {
      window.removeEventListener("chat:group-settings-updated", handler);
      window.removeEventListener("chat:join-request-created", joinHandler);
    };
  }, [open, conversationId, loadSettings, loadRequests]);

  const persist = async (
    patch: { permissions?: Partial<Permissions>; policies?: Partial<Policies>; features?: Partial<Features> },
    key: string
  ) => {
    if (!canManage) {
      toast.error("Chỉ Trưởng nhóm và Phó nhóm mới có quyền thay đổi cài đặt nhóm");
      return;
    }
    setSavingKey(key);
    try {
      const res = await chatService.updateGroupSettings(conversationId, patch);
      const parsed = readSettings(unwrap(res));
      if (parsed) {
        setSettings(parsed);
        useChatStore.setState((state) => {
          const detail = state.conversationDetailById?.[conversationId];
          return {
            listConversation: state.listConversation.map((cvs) =>
              cvs.id === conversationId ? { ...cvs, settings: parsed } : cvs
            ),
            conversationDetailById: detail
              ? {
                  ...state.conversationDetailById,
                  [conversationId]: { ...detail, settings: parsed },
                }
              : state.conversationDetailById,
          };
        });
      }
      toast.success("Đã lưu cài đặt nhóm");
      fetchListConversation({ page: 1, limit: 20 }).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể lưu cài đặt nhóm");
      loadSettings();
    } finally {
      setSavingKey(null);
    }
  };

  const setPermission = (key: keyof Permissions, value: boolean) => {
    if (!canManage) return;
    setSettings((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value },
    }));
    persist({ permissions: { [key]: value } }, key);
  };

  const setPolicy = (key: keyof Policies, value: boolean | number) => {
    if (!canManage) return;
    setSettings((prev) => ({
      ...prev,
      policies: { ...prev.policies, [key]: value } as Policies,
    }));
    persist({ policies: { [key]: value } as Partial<Policies> }, key);
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Đã sao chép liên kết mời");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const handleResetLink = async () => {
    if (!canManage) return;
    setResettingLink(true);
    try {
      await chatService.resetGroupInviteLink(conversationId);
      await loadInviteLink();
      toast.success("Đã tạo liên kết mời mới");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tạo liên kết mới");
    } finally {
      setResettingLink(false);
    }
  };

  const handleReviewRequest = async (requestId: string, action: "approve" | "reject") => {
    if (!canManage) return;
    setReviewingId(requestId);
    try {
      if (action === "approve") {
        await chatService.approveJoinRequest(conversationId, requestId);
        toast.success("Đã duyệt thành viên vào nhóm");
        fetchConversationDetail(conversationId, true).catch(() => {});
      } else {
        await chatService.rejectJoinRequest(conversationId, requestId);
        toast.success("Đã từ chối yêu cầu tham gia");
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchListConversation({ page: 1, limit: 20 }).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể xử lý yêu cầu");
    } finally {
      setReviewingId(null);
    }
  };

  const handleRoleChange = async (memberId: string, role: "ADMIN" | "MEMBER") => {
    setRoleActionId(memberId);
    try {
      await chatService.updateMemberRole(conversationId, memberId, role);
      toast.success(role === "ADMIN" ? "Đã bổ nhiệm Phó nhóm" : "Đã gỡ quyền Phó nhóm");
      await fetchConversationDetail(conversationId, true);
      fetchListConversation({ page: 1, limit: 20 }).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể cập nhật vai trò");
    } finally {
      setRoleActionId(null);
    }
  };

  const handleTransferOwner = async (memberId: string) => {
    if (!window.confirm("Bạn có chắc muốn chuyển quyền Trưởng nhóm cho thành viên này?")) return;
    setRoleActionId(memberId);
    try {
      await chatService.transferOwnership(conversationId, memberId);
      toast.success("Đã chuyển quyền Trưởng nhóm");
      await fetchConversationDetail(conversationId, true);
      fetchListConversation({ page: 1, limit: 20 }).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể chuyển quyền Trưởng nhóm");
    } finally {
      setRoleActionId(null);
    }
  };

  const handleDisband = async () => {
    setDisbanding(true);
    try {
      await chatService.disbandGroup(conversationId);
      toast.success("Đã giải tán nhóm");
      setConfirmDisband(false);
      onClose();
      fetchListConversation({ page: 1, limit: 20 }).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể giải tán nhóm");
    } finally {
      setDisbanding(false);
    }
  };

  const memberRows = useMemo(() => {
    const roleWeight = (role?: string) => (role === "OWNER" ? 0 : role === "ADMIN" ? 1 : 2);
    return [...members].sort(
      (a: any, b: any) => roleWeight(a.role) - roleWeight(b.role)
    );
  }, [members]);

  const retentionValue = String(settings.policies.messageRetention ?? 0);

  return (
    <>
      <StyledDialog open={open} onClose={onClose} fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            py: 1.5,
            px: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsOutlinedIcon sx={{ color: "#0068FF" }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Quản trị & Cài đặt nhóm
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: "#F7F8FA" }}>
          {/* Group identity */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2.5,
              py: 1.75,
              bgcolor: "#FFFFFF",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <Avatar
              src={resolveMediaUrl(conversation?.avatarUrl) || undefined}
              sx={{ width: 48, height: 48, bgcolor: "#0068FF", fontSize: 18 }}
            >
              {(conversation?.title || conversation?.name || "N")?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {conversation?.title || conversation?.name || "Nhóm"}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#6B7280" }}>
                {conversation?.memberCount ?? members.length} thành viên
              </Typography>
            </Box>
            <Chip
              icon={roleIcon}
              label={roleLabel}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: 12,
                bgcolor: isOwner ? "#FEF3C7" : canManage ? "#E0F2FE" : "#F3F4F6",
                color: isOwner ? "#92400E" : canManage ? "#075985" : "#4B5563",
              }}
            />
          </Box>

          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              bgcolor: "#FFFFFF",
              borderBottom: "1px solid #E5E7EB",
              minHeight: 44,
              px: 1,
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: 13,
                fontWeight: 600,
                minHeight: 44,
                minWidth: "auto",
                px: 2,
              },
            }}
          >
            <Tab icon={<TuneOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quyền thành viên" />
            <Tab
              icon={<ShieldOutlinedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Phê duyệt & Tham gia
                  {requests.length > 0 && (
                    <Chip
                      size="small"
                      label={requests.length}
                      sx={{ height: 18, fontSize: 11, bgcolor: "#EF4444", color: "#fff" }}
                    />
                  )}
                </Box>
              }
            />
            <Tab icon={<GroupsOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản trị viên" />
            <Tab icon={<WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Nâng cao" />
          </Tabs>

          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minHeight: 320 }}>
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <CircularProgress size={22} />
              </Box>
            )}

            {!canManage && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: "#92400E" }}>
                  Bạn đang xem cài đặt ở chế độ chỉ đọc. Chỉ Trưởng nhóm và Phó nhóm mới có thể thay đổi.
                </Typography>
              </Box>
            )}

            {/* TAB 0: Permissions */}
            {tab === 0 && (
              <SectionCard>
                <SectionHeader>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    Quyền của thành viên
                  </Typography>
                </SectionHeader>
                <SwitchRow
                  icon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} />}
                  iconBg="#EFF6FF"
                  iconColor="#0068FF"
                  title="Gửi tin nhắn văn bản"
                  description="Cho phép thành viên thường gửi tin nhắn trong nhóm"
                  checked={settings.permissions.canSendMessage}
                  disabled={!canManage}
                  loading={savingKey === "canSendMessage"}
                  onChange={(v) => setPermission("canSendMessage", v)}
                />
                <Divider />
                <SwitchRow
                  icon={<PermMediaOutlinedIcon sx={{ fontSize: 18 }} />}
                  iconBg="#ECFDF5"
                  iconColor="#059669"
                  title="Gửi ảnh, video, tập tin"
                  description="Cho phép thành viên gửi hình ảnh, video, tệp đính kèm và tin nhắn thoại"
                  checked={settings.permissions.canSendMedia}
                  disabled={!canManage}
                  loading={savingKey === "canSendMedia"}
                  onChange={(v) => setPermission("canSendMedia", v)}
                />
                <Divider />
                <SwitchRow
                  icon={<PollOutlinedIcon sx={{ fontSize: 18 }} />}
                  iconBg="#EEF2FF"
                  iconColor="#4F46E5"
                  title="Tạo bình chọn, ghi chú"
                  description="Cho phép thành viên tạo bình chọn, ghi chú và nhắc hẹn trong nhóm"
                  checked={settings.permissions.canCreatePolls}
                  disabled={!canManage}
                  loading={savingKey === "canCreatePolls"}
                  onChange={(v) => setPermission("canCreatePolls", v)}
                />
                <Divider />
                <SwitchRow
                  icon={<PushPinOutlinedIcon sx={{ fontSize: 18 }} />}
                  iconBg="#FFF7ED"
                  iconColor="#EA580C"
                  title="Ghim tin nhắn"
                  description="Cho phép thành viên ghim tin nhắn và ghi chú lên đầu đoạn chat"
                  checked={settings.permissions.canPinMessage}
                  disabled={!canManage}
                  loading={savingKey === "canPinMessage"}
                  onChange={(v) => setPermission("canPinMessage", v)}
                />
                <Divider />
                <SwitchRow
                  icon={<EditOutlinedIcon sx={{ fontSize: 18 }} />}
                  iconBg="#F5F3FF"
                  iconColor="#7C3AED"
                  title="Đổi tên & ảnh đại diện nhóm"
                  description="Cho phép thành viên thay đổi tên và ảnh đại diện của nhóm"
                  checked={settings.permissions.canUpdateGroupInfo}
                  disabled={!canManage}
                  loading={savingKey === "canUpdateGroupInfo"}
                  onChange={(v) => setPermission("canUpdateGroupInfo", v)}
                />
                <Divider />
                <SwitchRow
                  icon={<PersonAddAlt1OutlinedIcon sx={{ fontSize: 18 }} />}
                  iconBg="#F0FDF4"
                  iconColor="#16A34A"
                  title="Thêm thành viên mới"
                  description="Cho phép thành viên mời thêm người khác vào nhóm"
                  checked={settings.permissions.canAddMembers}
                  disabled={!canManage}
                  loading={savingKey === "canAddMembers"}
                  onChange={(v) => setPermission("canAddMembers", v)}
                />
              </SectionCard>
            )}

            {/* TAB 1: Join & approval */}
            {tab === 1 && (
              <>
                <SectionCard>
                  <SectionHeader>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                      Phê duyệt thành viên
                    </Typography>
                  </SectionHeader>
                  <SwitchRow
                    icon={<HowToRegOutlinedIcon sx={{ fontSize: 18 }} />}
                    iconBg="#EEF2FF"
                    iconColor="#4338CA"
                    title="Duyệt thành viên mới"
                    description="Yêu cầu Quản trị viên phê duyệt trước khi thành viên mới vào nhóm"
                    checked={settings.policies.inviteApproval}
                    disabled={!canManage}
                    loading={savingKey === "inviteApproval"}
                    onChange={(v) => setPolicy("inviteApproval", v)}
                  />
                  {canManage && settings.policies.inviteApproval && (
                    <>
                      <Divider />
                      <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#374151", mb: 1 }}>
                          Danh sách chờ duyệt
                        </Typography>
                        {requestsLoading ? (
                          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                            <CircularProgress size={18} />
                          </Box>
                        ) : requests.length === 0 ? (
                          <Typography sx={{ fontSize: 12.5, color: "#9CA3AF" }}>
                            Không có yêu cầu nào đang chờ duyệt.
                          </Typography>
                        ) : (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {requests.map((request) => (
                              <Box
                                key={request.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.25,
                                  p: 1,
                                  borderRadius: 2,
                                  border: "1px solid #E5E7EB",
                                  bgcolor: "#FFFFFF",
                                }}
                              >
                                <Avatar
                                  src={resolveMediaUrl(request.avatarUrl) || undefined}
                                  sx={{ width: 34, height: 34, fontSize: 14 }}
                                >
                                  {(request.displayName || request.username || "U")
                                    .charAt(0)
                                    .toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#111827",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {request.displayName || request.username || request.userId}
                                  </Typography>
                                  <Typography sx={{ fontSize: 11.5, color: "#9CA3AF" }}>
                                    {formatRequestTime(request.createdAt)}
                                  </Typography>
                                </Box>
                                {reviewingId === request.id ? (
                                  <CircularProgress size={18} sx={{ mr: 1 }} />
                                ) : (
                                  <Box sx={{ display: "flex", gap: 0.75 }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      startIcon={<CheckRoundedIcon sx={{ fontSize: 16 }} />}
                                      onClick={() => handleReviewRequest(request.id, "approve")}
                                      sx={{ textTransform: "none", fontSize: 12, minWidth: 0 }}
                                    >
                                      Đồng ý
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      onClick={() => handleReviewRequest(request.id, "reject")}
                                      sx={{ textTransform: "none", fontSize: 12, minWidth: 0 }}
                                    >
                                      Từ chối
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                </SectionCard>

                <SectionCard>
                  <SectionHeader>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                      Tham gia & liên kết mời
                    </Typography>
                  </SectionHeader>
                  <SwitchRow
                    icon={<LinkRoundedIcon sx={{ fontSize: 18 }} />}
                    iconBg="#EFF6FF"
                    iconColor="#2563EB"
                    title="Mời vào nhóm bằng liên kết"
                    description="Cho phép người khác tham gia nhóm thông qua liên kết mời"
                    checked={settings.policies.allowJoinViaLink}
                    disabled={!canManage}
                    loading={savingKey === "allowJoinViaLink"}
                    onChange={(v) => setPolicy("allowJoinViaLink", v)}
                  />
                  {settings.policies.allowJoinViaLink && (
                    <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          px: 1.25,
                          py: 0.9,
                          borderRadius: 2,
                          bgcolor: "#F3F4F6",
                          border: "1px solid #E5E7EB",
                          fontSize: 12.5,
                          color: "#374151",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {inviteLoading ? "Đang tải liên kết..." : inviteLink || "Chưa có liên kết"}
                      </Box>
                      <Tooltip title="Sao chép liên kết">
                        <span>
                          <IconButton size="small" onClick={handleCopyLink} disabled={!inviteLink}>
                            <ContentCopyRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Tạo liên kết mới">
                        <span>
                          <IconButton
                            size="small"
                            onClick={handleResetLink}
                            disabled={!canManage || resettingLink}
                          >
                            {resettingLink ? (
                              <CircularProgress size={16} />
                            ) : (
                              <RefreshRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  )}
                  <Divider />
                  <SwitchRow
                    icon={<HistoryRoundedIcon sx={{ fontSize: 18 }} />}
                    iconBg="#FEF3C7"
                    iconColor="#D97706"
                    title="Xem tin nhắn cũ"
                    description="Cho phép thành viên mới đọc tin nhắn trước khi tham gia nhóm"
                    checked={settings.policies.allowViewPastMessages}
                    disabled={!canManage}
                    loading={savingKey === "allowViewPastMessages"}
                    onChange={(v) => setPolicy("allowViewPastMessages", v)}
                  />
                  <Divider />
                  <SwitchRow
                    icon={<VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />}
                    iconBg="#F3F4F6"
                    iconColor="#4B5563"
                    title="Ẩn danh sách thành viên"
                    description="Chỉ Trưởng nhóm và Phó nhóm mới xem được danh sách thành viên"
                    checked={settings.policies.hideMemberList}
                    disabled={!canManage}
                    loading={savingKey === "hideMemberList"}
                    onChange={(v) => setPolicy("hideMemberList", v)}
                  />
                </SectionCard>
              </>
            )}

            {/* TAB 2: Roles */}
            {tab === 2 && (
              <SectionCard>
                <SectionHeader>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    Trưởng nhóm & Phó nhóm
                  </Typography>
                </SectionHeader>
                {memberRows.length === 0 ? (
                  <Typography sx={{ p: 2, fontSize: 12.5, color: "#9CA3AF" }}>
                    Chưa tải được danh sách thành viên.
                  </Typography>
                ) : (
                  memberRows.map((member: any, index: number) => {
                    const memberId = member.userId || member.id;
                    const isSelf = memberId === currentUserId;
                    const memberRole = member.role;
                    return (
                      <Box key={memberId || index}>
                        {index > 0 && <Divider />}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            px: 2,
                            py: 1.1,
                          }}
                        >
                          <Avatar
                            src={resolveMediaUrl(member.avatarUrl) || undefined}
                            sx={{ width: 34, height: 34, fontSize: 14 }}
                          >
                            {(member.displayName || member.username || "U").charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#111827",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {member.displayName || member.username || memberId}
                              {isSelf ? " (Bạn)" : ""}
                            </Typography>
                            {memberRole === "OWNER" && (
                              <Typography
                                sx={{
                                  fontSize: 11.5,
                                  color: "#B45309",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.4,
                                  fontWeight: 500,
                                }}
                              >
                                <WorkspacePremiumRoundedIcon sx={{ fontSize: 14 }} />
                                Trưởng nhóm
                              </Typography>
                            )}
                            {memberRole === "ADMIN" && (
                              <Typography
                                sx={{
                                  fontSize: 11.5,
                                  color: "#0369A1",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.4,
                                  fontWeight: 500,
                                }}
                              >
                                <VerifiedUserRoundedIcon sx={{ fontSize: 14 }} />
                                Phó nhóm
                              </Typography>
                            )}
                          </Box>
                          {isOwner && !isSelf && memberRole !== "OWNER" && (
                            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                              {roleActionId === memberId ? (
                                <CircularProgress size={16} />
                              ) : (
                                <>
                                  {memberRole === "ADMIN" ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      onClick={() => handleRoleChange(memberId, "MEMBER")}
                                      sx={{ textTransform: "none", fontSize: 11.5, minWidth: 0 }}
                                    >
                                      Gỡ quyền
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleRoleChange(memberId, "ADMIN")}
                                      sx={{ textTransform: "none", fontSize: 11.5, minWidth: 0 }}
                                    >
                                      Bổ nhiệm
                                    </Button>
                                  )}
                                  <Button
                                    size="small"
                                    color="warning"
                                    onClick={() => handleTransferOwner(memberId)}
                                    sx={{ textTransform: "none", fontSize: 11.5, minWidth: 0 }}
                                  >
                                    Chuyển quyền
                                  </Button>
                                </>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </SectionCard>
            )}

            {/* TAB 3: Advanced */}
            {tab === 3 && (
              <>
                <SectionCard>
                  <SectionHeader>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                      Cài đặt nâng cao
                    </Typography>
                  </SectionHeader>
                  <SettingRow>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pr: 2 }}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          bgcolor: "#EFF6FF",
                          color: "#0068FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          mt: 0.2,
                        }}
                      >
                        <TimerOutlinedIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          Tin nhắn tự xóa
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.25 }}>
                          Tự động xóa tin nhắn sau khoảng thời gian đã đặt
                        </Typography>
                      </Box>
                    </Box>
                    {savingKey === "messageRetention" ? (
                      <CircularProgress size={20} sx={{ mr: 1.5 }} />
                    ) : (
                      <FormControl size="small" sx={{ minWidth: 118 }}>
                        <Select
                          value={retentionValue}
                          onChange={(e) => setPolicy("messageRetention", Number(e.target.value))}
                          disabled={!canManage}
                          sx={{ fontSize: 13 }}
                        >
                          <MenuItem value="0">Tắt</MenuItem>
                          <MenuItem value="1">1 ngày</MenuItem>
                          <MenuItem value="7">7 ngày</MenuItem>
                          <MenuItem value="30">30 ngày</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </SettingRow>
                </SectionCard>

                {isOwner && (
                  <SectionCard sx={{ borderColor: "#FECACA" }}>
                    <SectionHeader sx={{ bgcolor: "#FEF2F2", borderColor: "#FECACA" }}>
                      <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: "#B91C1C" }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
                        Vùng nguy hiểm
                      </Typography>
                    </SectionHeader>
                    <SettingRow>
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pr: 2 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2,
                            bgcolor: "#FEE2E2",
                            color: "#DC2626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            mt: 0.2,
                          }}
                        >
                          <DeleteForeverOutlinedIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            Giải tán nhóm
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.25 }}>
                            Xóa vĩnh viễn nhóm và toàn bộ tin nhắn. Không thể hoàn tác.
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => setConfirmDisband(true)}
                        sx={{ textTransform: "none", fontSize: 12.5, flexShrink: 0 }}
                      >
                        Giải tán nhóm
                      </Button>
                    </SettingRow>
                  </SectionCard>
                )}
              </>
            )}
          </Box>
        </DialogContent>
      </StyledDialog>

      {/* Confirm disband */}
      <Dialog
        open={confirmDisband}
        onClose={() => setConfirmDisband(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Giải tán nhóm?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: "#4B5563" }}>
            Toàn bộ thành viên sẽ bị xóa khỏi nhóm và lịch sử tin nhắn sẽ không thể khôi phục. Bạn có chắc chắn?
          </Typography>
        </DialogContent>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDisband(false)} disabled={disbanding} sx={{ textTransform: "none" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisband}
            disabled={disbanding}
            sx={{ textTransform: "none" }}
          >
            {disbanding ? <CircularProgress size={18} color="inherit" /> : "Giải tán"}
          </Button>
        </Box>
      </Dialog>
    </>
  );
}
