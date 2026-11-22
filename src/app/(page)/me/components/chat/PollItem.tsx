"use client";

import { ConversationPoll } from "@/src/common/interface/conversation-interface";
import { chatService } from "@/src/common/service/chat-service";
import { useAuthStore } from "@/src/common/store/useAuthStore";
import { useTrans } from "@/src/common/utilities/hook/trans";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ListItemIcon,
} from "@mui/material";
import {
  HowToVote,
  Add,
  MoreVert,
  Lock,
  Delete,
  Edit,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { toast } from "react-toastify";

const Root = styled(Box, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  backgroundColor: "#F8FAFF",
  border: "1px solid #E5E7EB",
  borderRadius: compact ? "8px" : "12px",
  padding: compact ? "10px" : "16px",
  margin: compact ? "4px 0" : "8px 0",
  maxWidth: compact ? "100%" : undefined,
}));

const Header = styled(Box, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: compact ? "8px" : "12px",
}));

const Question = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  fontSize: compact ? "14px" : "16px",
  fontWeight: 600,
  color: "#111827",
  marginBottom: "4px",
  wordBreak: "break-word",
}));

const Meta = styled(Box, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: compact ? "8px" : "12px",
}));

const StatusChip = styled(Chip)(({ status }: { status: string }) => ({
  fontSize: "11px",
  height: "20px",
  ...(status === "OPEN" && {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  }),
  ...(status === "CLOSED" && {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  }),
}));

const OptionsContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  display: "flex",
  flexDirection: "column",
  gap: compact ? "6px" : "8px",
  marginBottom: compact ? "8px" : "12px",
}));

const OptionItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  position: "relative",
  padding: compact ? "8px 10px" : "12px",
  borderRadius: "8px",
  border: "2px solid #E5E7EB",
  backgroundColor: "#FFFFFF",
  cursor: "pointer",
  transition: "all 0.2s ease",
  "&:hover": {
    borderColor: "#3B82F6",
    backgroundColor: "#F9FAFB",
  },
  '&[data-is-voted="true"]': {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  '&[data-is-voted="true"]:hover': {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
}));

const ProgressBar = styled(Box)(({ percentage }: { percentage: number }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  width: `${percentage}%`,
  backgroundColor: "rgba(59, 130, 246, 0.1)",
  borderRadius: "6px",
  zIndex: 0,
}));

const OptionContent = styled(Box)({
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

const OptionLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ compact }) => ({
  fontSize: compact ? "13px" : "14px",
  fontWeight: 500,
  color: "#111827",
  wordBreak: "break-word",
}));

const VoteCount = styled(Typography)({
  fontSize: "12px",
  color: "#6B7280",
  fontWeight: 600,
});

const Percentage = styled(Typography)({
  fontSize: "12px",
  color: "#3B82F6",
  fontWeight: 600,
});

const Actions = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

const VoteButton = styled(Button)<{ isVoted?: boolean }>(({ isVoted }) => ({
  ...(isVoted && {
    backgroundColor: "#3B82F6",
    color: "#FFFFFF",
    "&:hover": {
      backgroundColor: "#2563EB",
    },
  }),
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
  const authData = useAuthStore((s) => s.authData);
  const [isVoting, setIsVoting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);

  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const isOwner = poll.createdBy === authData?.data?.user?.id;
  const hasVoted = poll.userVote && poll.userVote.optionIds.length > 0;
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error(t("POLL.VOTE_REQUIRED"));
      return;
    }

    if (poll.status !== "OPEN" || isExpired) {
      toast.error(t("POLL.POLL_CLOSED"));
      return;
    }

    setIsVoting(true);
    try {
      await chatService.votePoll(conversationId, poll.id, {
        option_ids: selectedOptions,
      });
      toast.success(t("POLL.VOTE_SUCCESS"));
      onVote?.();
    } catch (error) {
      toast.error(t("POLL.VOTE_FAILED"));
    } finally {
      setIsVoting(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      await chatService.withdrawVote(conversationId, poll.id);
      toast.success(t("POLL.WITHDRAW_SUCCESS"));
      onWithdraw?.();
    } catch (error) {
      toast.error(t("POLL.WITHDRAW_FAILED"));
    }
  };

  const handleClose = async () => {
    try {
      await chatService.closePoll(conversationId, poll.id);
      toast.success(t("POLL.CLOSE_SUCCESS"));
      onClose?.();
    } catch (error) {
      toast.error("Không thể đóng cuộc bình chọn");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await chatService.deletePoll(conversationId, poll.id);
      toast.success("Đã xóa cuộc bình chọn");
      setDeleteDialogOpen(false);
      onDelete?.();
    } catch (error) {
      toast.error("Không thể xóa cuộc bình chọn");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOptionLabel.trim()) return;
    setIsAddingOption(true);
    try {
      await chatService.addPollOption(conversationId, poll.id, newOptionLabel.trim());
      toast.success("Đã thêm lựa chọn");
      setNewOptionLabel("");
      setAddOptionOpen(false);
      onVote?.(); // refresh poll
    } catch (error) {
      toast.error("Không thể thêm lựa chọn");
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleOptionClick = (optionId: string) => {
    if (poll.status !== "OPEN" || isExpired) return;

    if (poll.allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  return (
    <Root compact={compact}>
      <Header compact={compact}>
        <Box>
          <Question compact={compact}>{poll.question}</Question>
          <Meta compact={compact}>
            <StatusChip
              label={isExpired ? "Hết hạn" : poll.status === "OPEN" ? "Đang mở" : "Đã đóng"}
              status={isExpired ? "CLOSED" : poll.status}
            />
            {poll.isAnonymous && (
              <Tooltip title="Bình chọn ẩn danh">
                <Lock sx={{ fontSize: 16, color: "#6B7280" }} />
              </Tooltip>
            )}
            {poll.allowMultiple && (
              <Tooltip title="Chọn nhiều lựa chọn">
                <HowToVote sx={{ fontSize: 16, color: "#6B7280" }} />
              </Tooltip>
            )}
            <Typography variant="caption" color="#6B7280">
              {totalVotes} bình chọn
            </Typography>
          </Meta>
        </Box>
        {isOwner && (
          <Box>
            {poll.status === "OPEN" && (
              <Tooltip title="Đóng bình chọn">
                <IconButton size="small" onClick={handleClose}>
                  <Lock sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Thêm tùy chọn">
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                <MoreVert sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              {onEdit && (
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    onEdit();
                  }}
                >
                  <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                  Chỉnh sửa
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setDeleteDialogOpen(true);
                }}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                Xóa cuộc bình chọn
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Header>

      <OptionsContainer compact={compact}>
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = selectedOptions.includes(option.id);
          const isUserVoted = hasVoted && poll.userVote?.optionIds.includes(option.id);

          return (
            <OptionItem
              key={option.id}
              compact={compact}
              data-is-voted={isUserVoted}
              onClick={() => handleOptionClick(option.id)}
            >
              {(hasVoted || poll.status === "CLOSED") && (
                <ProgressBar percentage={percentage} />
              )}
              <OptionContent>
                <OptionLabel compact={compact}>{option.label}</OptionLabel>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {(hasVoted || poll.status === "CLOSED") && (
                    <>
                      <VoteCount>{option.votes}</VoteCount>
                      <Percentage>{percentage.toFixed(1)}%</Percentage>
                    </>
                  )}
                  {isSelected && poll.status === "OPEN" && (
                    <HowToVote sx={{ fontSize: 16, color: "#3B82F6" }} />
                  )}
                </Box>
              </OptionContent>
            </OptionItem>
          );
        })}
      </OptionsContainer>

      <Actions>
        {poll.status === "OPEN" && !isExpired && (
          <>
            {!hasVoted ? (
              <VoteButton
                variant="contained"
                onClick={handleVote}
                disabled={selectedOptions.length === 0 || isVoting}
                isVoted={selectedOptions.length > 0}
              >
                {isVoting ? "Đang bình chọn..." : "Bình chọn"}
              </VoteButton>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleWithdraw}
                  disabled={isVoting}
                >
                  Thu hồi
                </Button>
                {poll.allowAddOption && (
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setAddOptionOpen(true)}
                  >
                    Thêm lựa chọn
                  </Button>
                )}
              </Box>
            )}
          </>
        )}

        {poll.expiresAt && (
          <Typography variant="caption" color="#6B7280">
            Hết hạn: {new Date(poll.expiresAt).toLocaleString()}
          </Typography>
        )}
      </Actions>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Xóa cuộc bình chọn?</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc chắn muốn xóa cuộc bình chọn &quot;{poll.question}&quot;? Hành động này không thể hoàn tác.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Hủy</Button>
          <Button onClick={handleDelete} color="error" disabled={isDeleting} variant="contained">
            {isDeleting ? "Đang xóa..." : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Option Dialog */}
      <Dialog open={addOptionOpen} onClose={() => setAddOptionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Thêm lựa chọn</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            label="Nội dung lựa chọn"
            value={newOptionLabel}
            onChange={(e) => setNewOptionLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOptionOpen(false)} disabled={isAddingOption}>Hủy</Button>
          <Button onClick={handleAddOption} disabled={!newOptionLabel.trim() || isAddingOption} variant="contained">
            {isAddingOption ? "Đang thêm..." : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Root>
  );
}
