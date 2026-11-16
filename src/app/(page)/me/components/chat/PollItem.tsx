"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationPoll } from "@/src/common/interface/conversation-interface";
import { chatService } from "@/src/common/service/chat-service";
import { useAuthStore } from "@/src/common/store/useAuthStore";
import { useChatStore } from "@/src/common/store/useChatStore";
import { useTrans } from "@/src/common/utilities/hook/trans";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import PollVotersDialog from "./PollVotersDialog";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CheckBoxOutlineBlankRoundedIcon from "@mui/icons-material/CheckBoxOutlineBlankRounded";
import CheckBoxRoundedIcon from "@mui/icons-material/CheckBoxRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";

const CardRoot = styled(Box)<{ compact?: number }>(({ compact }) => ({
  backgroundColor: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  padding: compact ? "14px" : "16px",
  boxShadow: compact ? "0 1px 4px rgba(15, 23, 42, 0.05)" : "0 2px 8px rgba(15, 23, 42, 0.06)",
  width: compact ? "min(360px, 100%)" : "100%",
}));

const OptionRow = styled(Box)<{ selected?: number; locked?: number }>(({ selected, locked }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 10,
  border: selected ? "1.5px solid #0068FF" : "1px solid #E2E8F0",
  backgroundColor: selected ? "#F0F7FF" : "#F8FAFC",
  padding: "9px 12px",
  cursor: locked ? "default" : "pointer",
  transition: "border-color 0.2s ease, background-color 0.2s ease",
  "&:hover": locked
    ? {}
    : {
        borderColor: "#0068FF",
        backgroundColor: "#F0F7FF",
      },
}));

const ProgressFill = styled(Box)<{ percentage: number; active?: number }>(({ percentage, active }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  width: `${Math.min(100, Math.max(0, percentage))}%`,
  backgroundColor: active ? "rgba(0, 104, 255, 0.16)" : "rgba(59, 130, 246, 0.10)",
  transition: "width 0.35s ease",
  zIndex: 0,
  pointerEvents: "none",
}));

interface PollItemProps {
  poll: ConversationPoll;
  conversationId: string;
  compact?: boolean;
  onVote?: () => void;
  onWithdraw?: () => void;
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function sameSelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

function formatDeadline(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${d.toLocaleDateString(
    "vi-VN",
    { day: "2-digit", month: "2-digit" }
  )}`;
}

export default function PollItem({
  poll,
  conversationId,
  compact = false,
  onVote,
  onWithdraw,
  onClose,
  onEdit,
  onDelete,
}: PollItemProps) {
  const t = useTrans();
  const authUserId = useAuthStore((s) => s.authData?.data?.user?.id);
  const storeUserId = useChatStore((s) => s.currentUserId);
  const currentUserId = authUserId || storeUserId || "";

  const listConversation = useChatStore((s) => s.listConversation);
  const convDetail = useChatStore((s) => s.conversationDetailById?.[conversationId]);

  const isGroupAdmin = useMemo(() => {
    const members = (
      convDetail?.members?.length
        ? convDetail.members
        : listConversation.find((c) => c.id === conversationId)?.members
    ) as any[] | undefined;
    const me = members?.find((m) => (m.userId || m.id) === currentUserId);
    return me?.role === "OWNER" || me?.role === "ADMIN";
  }, [convDetail, listConversation, conversationId, currentUserId]);

  const savedVoteIds = useMemo(() => poll.userVote?.optionIds || [], [poll.userVote?.optionIds]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(savedVoteIds);
  const [isVoting, setIsVoting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [votersModalOpen, setVotersModalOpen] = useState(false);

  useEffect(() => {
    setSelectedOptions(savedVoteIds);
  }, [savedVoteIds, poll.id]);

  const totalVotes = poll.options.reduce((sum, option) => sum + (option.votes || 0), 0);
  const totalVoters = poll.totalVoters ?? totalVotes;
  const isCreator = poll.createdBy === currentUserId;
  const canManagePoll = isCreator || isGroupAdmin;
  const hasVoted = savedVoteIds.length > 0;
  const isExpired = Boolean(poll.expiresAt && new Date(poll.expiresAt) < new Date());
  const isOpen = poll.status === "OPEN" && !isExpired;
  const hasSelectionChanged = !sameSelection(selectedOptions, savedVoteIds);

  const handleOptionClick = (optionId: string) => {
    if (!isOpen) return;

    if (poll.allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmitVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error(t("POLL.VOTE_REQUIRED"));
      return;
    }
    if (!isOpen) {
      toast.error(t("POLL.POLL_CLOSED"));
      return;
    }

    setIsVoting(true);
    try {
      await chatService.votePoll(conversationId, poll.id, {
        option_ids: selectedOptions,
      });
      toast.success(hasVoted ? "Đã cập nhật bình chọn" : t("POLL.VOTE_SUCCESS"));
      onVote?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("POLL.VOTE_FAILED"));
    } finally {
      setIsVoting(false);
    }
  };

  const handleWithdraw = async () => {
    setIsVoting(true);
    try {
      await chatService.withdrawVote(conversationId, poll.id);
      setSelectedOptions([]);
      toast.success(t("POLL.WITHDRAW_SUCCESS"));
      onWithdraw?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("POLL.WITHDRAW_FAILED"));
    } finally {
      setIsVoting(false);
    }
  };

  const handleClosePoll = async () => {
    try {
      await chatService.closePoll(conversationId, poll.id);
      toast.success(t("POLL.CLOSE_SUCCESS"));
      onClose?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể khóa cuộc bình chọn");
    }
  };

  const handleDeletePoll = async () => {
    setIsDeleting(true);
    try {
      await chatService.deletePoll(conversationId, poll.id);
      toast.success("Đã xóa cuộc bình chọn");
      setDeleteDialogOpen(false);
      onDelete?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể xóa cuộc bình chọn");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddOption = async () => {
    const trimmed = newOptionLabel.trim();
    if (!trimmed) return;
    setIsAddingOption(true);
    try {
      await chatService.addPollOption(conversationId, poll.id, trimmed);
      toast.success("Đã thêm lựa chọn mới");
      setNewOptionLabel("");
      setShowInlineAdd(false);
      onVote?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể thêm lựa chọn");
    } finally {
      setIsAddingOption(false);
    }
  };

  return (
    <>
      <CardRoot compact={compact ? 1 : 0}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                bgcolor: "#EFF6FF",
                color: "#0068FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PollOutlinedIcon sx={{ fontSize: 17 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11.5, color: "#64748B", fontWeight: 500 }} noWrap>
                {poll.createdByName ? `${poll.createdByName} đã tạo bình chọn` : "Bình chọn nhóm"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
            <Chip
              size="small"
              icon={!isOpen ? <LockOutlinedIcon sx={{ fontSize: "13px !important" }} /> : undefined}
              label={isExpired ? "Hết hạn" : poll.status === "OPEN" ? "Đang mở" : "Đã khóa"}
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: isOpen ? "#DCFCE7" : "#F1F5F9",
                color: isOpen ? "#166534" : "#475569",
              }}
            />
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertRoundedIcon sx={{ fontSize: 18, color: "#64748B" }} />
            </IconButton>
          </Box>
        </Box>

        {/* Question */}
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 700,
            color: "#0F172A",
            mt: 1,
            mb: 0.75,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {poll.question}
        </Typography>

        {/* Meta tags + Voters summary trigger */}
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.25 }}>
          <Box
            onClick={() => setVotersModalOpen(true)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.35,
              cursor: "pointer",
              color: "#0068FF",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            <PeopleOutlineRoundedIcon sx={{ fontSize: 15 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
              {totalVoters} người đã bình chọn
            </Typography>
            <ChevronRightRoundedIcon sx={{ fontSize: 15, ml: -0.25 }} />
          </Box>

          {poll.allowMultiple && (
            <Tooltip title="Có thể chọn nhiều phương án">
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.3, color: "#64748B" }}>
                <CheckBoxOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 11.5 }}>Chọn nhiều</Typography>
              </Box>
            </Tooltip>
          )}

          {poll.isAnonymous && (
            <Tooltip title="Bình chọn ẩn danh">
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.3, color: "#64748B" }}>
                <VisibilityOffOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 11.5 }}>Ẩn danh</Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Options list */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
          {poll.options.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isSelected = selectedOptions.includes(option.id);
            const isUserSaved = savedVoteIds.includes(option.id);
            const voters = !poll.isAnonymous ? poll.votersByOption?.[option.id] || [] : [];

            return (
              <OptionRow
                key={option.id}
                selected={isSelected ? 1 : 0}
                locked={!isOpen ? 1 : 0}
                onClick={() => handleOptionClick(option.id)}
              >
                {(hasVoted || !isOpen || totalVotes > 0) && (
                  <ProgressFill percentage={pct} active={isSelected || isUserSaved ? 1 : 0} />
                )}

                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                    {isOpen &&
                      (poll.allowMultiple ? (
                        isSelected ? (
                          <CheckBoxRoundedIcon sx={{ fontSize: 18, color: "#0068FF", flexShrink: 0 }} />
                        ) : (
                          <CheckBoxOutlineBlankRoundedIcon sx={{ fontSize: 18, color: "#94A3B8", flexShrink: 0 }} />
                        )
                      ) : isSelected ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "#0068FF", flexShrink: 0 }} />
                      ) : (
                        <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: "#94A3B8", flexShrink: 0 }} />
                      ))}
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: isSelected ? 600 : 500,
                        color: "#1E293B",
                        wordBreak: "break-word",
                      }}
                    >
                      {option.label}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                    {!poll.isAnonymous && voters.length > 0 && (
                      <AvatarGroup
                        max={3}
                        sx={{
                          "& .MuiAvatar-root": {
                            width: 19,
                            height: 19,
                            fontSize: 10,
                            border: "1.5px solid #fff",
                          },
                        }}
                      >
                        {voters.map((voter) => (
                          <Tooltip key={voter.userId} title={voter.displayName}>
                            <Avatar src={resolveMediaUrl(voter.avatarUrl) || undefined}>
                              {voter.displayName.charAt(0).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    )}

                    {(hasVoted || !isOpen || option.votes > 0) && (
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSelected ? "#0068FF" : "#475569",
                          minWidth: 22,
                          textAlign: "right",
                        }}
                      >
                        {option.votes}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </OptionRow>
            );
          })}
        </Box>

        {/* Inline add option */}
        {isOpen && poll.allowAddOption && (
          <Box sx={{ mt: 1 }}>
            {showInlineAdd ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="Nhập phương án mới..."
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    } else if (e.key === "Escape") {
                      setShowInlineAdd(false);
                      setNewOptionLabel("");
                    }
                  }}
                  slotProps={{ htmlInput: { maxLength: 150 } }}
                  disabled={isAddingOption}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 13 } }}
                />
                <Button
                  size="small"
                  variant="contained"
                  disabled={!newOptionLabel.trim() || isAddingOption}
                  onClick={handleAddOption}
                  sx={{ textTransform: "none", minWidth: 64, borderRadius: 2, bgcolor: "#0068FF" }}
                >
                  {isAddingOption ? <CircularProgress size={16} color="inherit" /> : "Thêm"}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setShowInlineAdd(false);
                    setNewOptionLabel("");
                  }}
                  disabled={isAddingOption}
                  sx={{ textTransform: "none", minWidth: 0, color: "#64748B" }}
                >
                  Hủy
                </Button>
              </Box>
            ) : (
              <Button
                size="small"
                startIcon={<AddRoundedIcon sx={{ fontSize: 17 }} />}
                onClick={() => setShowInlineAdd(true)}
                sx={{
                  textTransform: "none",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#475569",
                  px: 0.75,
                  "&:hover": { color: "#0068FF", bgcolor: "#EFF6FF" },
                }}
              >
                Thêm phương án
              </Button>
            )}
          </Box>
        )}

        {/* Footer actions & deadline */}
        <Box
          sx={{
            mt: 1.5,
            pt: 1.25,
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isOpen && (!hasVoted || hasSelectionChanged) && (
              <Button
                size="small"
                variant="contained"
                onClick={handleSubmitVote}
                disabled={selectedOptions.length === 0 || isVoting}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 12.5,
                  borderRadius: 2,
                  px: 2,
                  bgcolor: "#0068FF",
                  "&:hover": { bgcolor: "#0052CC" },
                }}
              >
                {isVoting
                  ? "Đang gửi..."
                  : hasVoted
                    ? "Cập nhật lựa chọn"
                    : "Bình chọn"}
              </Button>
            )}

            {isOpen && hasVoted && !hasSelectionChanged && (
              <Button
                size="small"
                variant="outlined"
                onClick={handleWithdraw}
                disabled={isVoting}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 12.5,
                  borderRadius: 2,
                  borderColor: "#CBD5E1",
                  color: "#475569",
                }}
              >
                Thu hồi phiếu
              </Button>
            )}
          </Box>

          {poll.expiresAt && (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, color: "#64748B" }}>
              <TimerOutlinedIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 11.5 }}>
                {isExpired ? "Đã kết thúc: " : "Kết thúc: "}
                {formatDeadline(poll.expiresAt)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardRoot>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2.5, minWidth: 190 } } }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setVotersModalOpen(true);
          }}
        >
          <ListItemIcon>
            <PeopleOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          Xem người bình chọn
        </MenuItem>

        {isCreator && isOpen && onEdit && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onEdit();
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            Chỉnh sửa câu hỏi
          </MenuItem>
        )}

        {canManagePoll && isOpen && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              handleClosePoll();
            }}
          >
            <ListItemIcon>
              <LockOutlinedIcon fontSize="small" />
            </ListItemIcon>
            Khóa bình chọn
          </MenuItem>
        )}

        {canManagePoll && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              setDeleteDialogOpen(true);
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteOutlineRoundedIcon fontSize="small" color="error" />
            </ListItemIcon>
            Xóa bình chọn
          </MenuItem>
        )}
      </Menu>

      {/* Voters modal */}
      <PollVotersDialog
        open={votersModalOpen}
        poll={poll}
        onClose={() => setVotersModalOpen(false)}
      />

      {/* Delete confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Xóa bình chọn?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: "#4B5563" }}>
            Bạn có chắc chắn muốn xóa cuộc bình chọn &quot;{poll.question}&quot;? Dữ liệu bình chọn sẽ không thể khôi phục.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} sx={{ textTransform: "none" }}>
            Hủy
          </Button>
          <Button
            onClick={handleDeletePoll}
            color="error"
            disabled={isDeleting}
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            {isDeleting ? "Đang xóa..." : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
