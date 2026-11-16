"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { styled } from "@mui/material/styles";
import type { ConversationPoll } from "@/src/common/interface/conversation-interface";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";

interface PollVotersDialogProps {
  open: boolean;
  poll: ConversationPoll | null;
  onClose: () => void;
}

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 14,
    maxWidth: 460,
    width: "100%",
    maxHeight: "80vh",
  },
});

export default function PollVotersDialog({ open, poll, onClose }: PollVotersDialogProps) {
  const [selectedTab, setSelectedTab] = useState<string>("ALL");

  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  const totalVoters = poll.totalVoters ?? totalVotes;
  const votersByOption = poll.votersByOption || {};
  const userVotedIds = poll.userVote?.optionIds || [];

  const visibleOptions =
    selectedTab === "ALL" ? poll.options : poll.options.filter((o) => o.id === selectedTab);

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
            Chi tiết bình chọn
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: "#F8FAFC" }}>
        <Box sx={{ p: 2, bgcolor: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#111827", mb: 0.75 }}>
            {poll.question}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              icon={<HowToVoteOutlinedIcon sx={{ fontSize: "14px !important" }} />}
              label={`${totalVoters} người tham gia • ${totalVotes} lượt chọn`}
              size="small"
              sx={{ fontSize: 11.5, bgcolor: "#EFF6FF", color: "#1D4ED8", fontWeight: 600 }}
            />
            {poll.isAnonymous && (
              <Chip
                icon={<VisibilityOffOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                label="Bình chọn ẩn danh"
                size="small"
                sx={{ fontSize: 11.5, bgcolor: "#F3F4F6", color: "#4B5563" }}
              />
            )}
          </Box>
        </Box>

        <Tabs
          value={selectedTab}
          onChange={(_, val) => setSelectedTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
            minHeight: 40,
            px: 1,
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: 12.5,
              fontWeight: 600,
              minHeight: 40,
              px: 1.5,
            },
          }}
        >
          <Tab value="ALL" label={`Tất cả (${poll.options.length})`} />
          {poll.options.map((opt) => (
            <Tab
              key={opt.id}
              value={opt.id}
              label={`${opt.label.slice(0, 18)}${opt.label.length > 18 ? "..." : ""} (${opt.votes})`}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {poll.isAnonymous && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "#F3F4F6",
                border: "1px solid #E5E7EB",
              }}
            >
              <VisibilityOffOutlinedIcon sx={{ color: "#6B7280", fontSize: 20 }} />
              <Typography sx={{ fontSize: 12.5, color: "#4B5563" }}>
                Đây là cuộc bình chọn ẩn danh. Danh tính người tham gia được giữ kín.
              </Typography>
            </Box>
          )}

          {visibleOptions.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const voters = votersByOption[option.id] || [];
            const votedByMe = userVotedIds.includes(option.id);

            return (
              <Box
                key={option.id}
                sx={{
                  bgcolor: "#FFFFFF",
                  borderRadius: 2.5,
                  border: votedByMe ? "1px solid #93C5FD" : "1px solid #E5E7EB",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 1.75,
                    py: 1.25,
                    bgcolor: votedByMe ? "#EFF6FF" : "#F9FAFB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                    {votedByMe && (
                      <CheckCircleRoundedIcon sx={{ fontSize: 16, color: "#0068FF", flexShrink: 0 }} />
                    )}
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>
                      {option.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#0068FF", flexShrink: 0 }}>
                    {option.votes} ({pct}%)
                  </Typography>
                </Box>

                {!poll.isAnonymous && (
                  <>
                    <Divider />
                    <Box sx={{ px: 1.75, py: 1 }}>
                      {voters.length === 0 ? (
                        <Typography sx={{ fontSize: 12, color: "#9CA3AF", py: 0.5 }}>
                          Chưa có thành viên nào chọn phương án này
                        </Typography>
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                          {voters.map((voter) => (
                            <Box
                              key={voter.userId}
                              sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}
                            >
                              <Avatar
                                src={resolveMediaUrl(voter.avatarUrl) || undefined}
                                sx={{ width: 26, height: 26, fontSize: 12, bgcolor: "#0068FF" }}
                              >
                                {voter.displayName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                                {voter.displayName}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </StyledDialog>
  );
}
