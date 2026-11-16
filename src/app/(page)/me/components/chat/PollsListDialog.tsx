"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { styled } from "@mui/material/styles";
import type { ConversationPoll } from "@/src/common/interface/conversation-interface";
import PollItem from "./PollItem";

interface PollsListDialogProps {
  open: boolean;
  conversationId: string;
  polls: ConversationPoll[];
  canCreatePoll?: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEditPoll: (poll: ConversationPoll) => void;
  onOpenCreatePoll?: () => void;
}

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 14,
    maxWidth: 560,
    width: "100%",
    maxHeight: "86vh",
  },
});

export default function PollsListDialog({
  open,
  conversationId,
  polls,
  canCreatePoll = true,
  onClose,
  onRefresh,
  onEditPoll,
  onOpenCreatePoll,
}: PollsListDialogProps) {
  const [tab, setTab] = useState<"OPEN" | "CLOSED">("OPEN");

  const { openPolls, closedPolls } = useMemo(() => {
    const now = Date.now();
    const openList: ConversationPoll[] = [];
    const closedList: ConversationPoll[] = [];
    polls.forEach((p) => {
      const expired = Boolean(p.expiresAt && new Date(p.expiresAt).getTime() < now);
      if (p.status === "OPEN" && !expired) {
        openList.push(p);
      } else {
        closedList.push(p);
      }
    });
    return { openPolls: openList, closedPolls: closedList };
  }, [polls]);

  const displayedPolls = tab === "OPEN" ? openPolls : closedPolls;

  return (
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
          <PollOutlinedIcon sx={{ color: "#0068FF", fontSize: 22 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Bảng bình chọn nhóm
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {canCreatePoll && onOpenCreatePoll && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                onClose();
                onOpenCreatePoll();
              }}
              sx={{
                textTransform: "none",
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 2,
                bgcolor: "#0068FF",
                "&:hover": { bgcolor: "#0052CC" },
              }}
            >
              Tạo mới
            </Button>
          )}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, val) => setTab(val)}
        sx={{
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          minHeight: 42,
          px: 2,
          "& .MuiTab-root": {
            textTransform: "none",
            fontSize: 13.5,
            fontWeight: 600,
            minHeight: 42,
          },
        }}
      >
        <Tab value="OPEN" label={`Đang diễn ra (${openPolls.length})`} />
        <Tab value="CLOSED" label={`Đã kết thúc (${closedPolls.length})`} />
      </Tabs>

      <DialogContent sx={{ p: 2, bgcolor: "#F8FAFC" }}>
        {displayedPolls.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <PollOutlinedIcon sx={{ fontSize: 42, color: "#CBD5E1", mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>
              {tab === "OPEN"
                ? "Chưa có cuộc bình chọn nào đang diễn ra"
                : "Chưa có cuộc bình chọn nào đã kết thúc"}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {displayedPolls.map((poll) => (
              <PollItem
                key={poll.id}
                poll={poll}
                conversationId={conversationId}
                onVote={onRefresh}
                onWithdraw={onRefresh}
                onClose={onRefresh}
                onEdit={() => onEditPoll(poll)}
                onDelete={onRefresh}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </StyledDialog>
  );
}
