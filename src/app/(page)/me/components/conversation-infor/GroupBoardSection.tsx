"use client";

import { Box, Typography, Button, Divider, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import AlarmOutlinedIcon from "@mui/icons-material/AlarmOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SectionBlock from "./SectionBlock";

interface GroupBoardSectionProps {
  pinnedCount?: number;
  pollsCount?: number;
  notesCount?: number;
  remindersCount?: number;
  todosCount?: number;
  onOpenCreatePoll?: () => void;
  onOpenCreateNote?: () => void;
  onOpenCreateReminder?: () => void;
  onOpenCreateTodo?: () => void;
  onViewPinned?: () => void;
  onViewPolls?: () => void;
}

const BoardItem = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 20px",
  transition: "background-color 0.15s ease",
  "&:hover": {
    backgroundColor: "#F8FAFC",
  },
});

const ItemLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  flex: 1,
});

const IconWrap = styled(Box)<{ bgcolor?: string; textcolor?: string }>(({ bgcolor, textcolor }) => ({
  width: 34,
  height: 34,
  borderRadius: 8,
  backgroundColor: bgcolor || "#F1F5F9",
  color: textcolor || "#334155",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export default function GroupBoardSection({
  pinnedCount = 0,
  pollsCount = 0,
  notesCount = 0,
  remindersCount = 0,
  todosCount = 0,
  onOpenCreatePoll,
  onOpenCreateNote,
  onOpenCreateReminder,
  onOpenCreateTodo,
  onViewPinned,
  onViewPolls,
}: GroupBoardSectionProps) {
  return (
    <SectionBlock title="Bảng tin nhóm" defaultOpen={true}>
      <Box sx={{ pb: 1 }}>
        {/* Pinned Messages */}
        <BoardItem>
          <ItemLeft onClick={onViewPinned}>
            <IconWrap bgcolor="#EFF6FF" textcolor="#2563EB">
              <PushPinOutlinedIcon sx={{ fontSize: 18 }} />
            </IconWrap>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                Tin nhắn đã ghim
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                {pinnedCount > 0 ? `${pinnedCount} tin nhắn đã ghim` : "Chưa có tin ghim"}
              </Typography>
            </Box>
          </ItemLeft>
        </BoardItem>

        <Divider sx={{ mx: 2.5, my: 0.5 }} />

        {/* Polls */}
        <BoardItem>
          <ItemLeft onClick={onViewPolls}>
            <IconWrap bgcolor="#EEF2FF" textcolor="#4F46E5">
              <PollOutlinedIcon sx={{ fontSize: 18 }} />
            </IconWrap>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                Bình chọn
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                {pollsCount > 0 ? `${pollsCount} cuộc bình chọn` : "Chưa có bình chọn"}
              </Typography>
            </Box>
          </ItemLeft>
          {onOpenCreatePoll && (
            <Tooltip title="Tạo bình chọn mới">
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={onOpenCreatePoll}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.4,
                  px: 1.2,
                  borderRadius: 1.5,
                  bgcolor: "#EEF2FF",
                  color: "#4F46E5",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#E0E7FF" },
                }}
              >
                Tạo
              </Button>
            </Tooltip>
          )}
        </BoardItem>

        <Divider sx={{ mx: 2.5, my: 0.5 }} />

        {/* Reminders */}
        <BoardItem>
          <ItemLeft>
            <IconWrap bgcolor="#FEF3C7" textcolor="#D97706">
              <AlarmOutlinedIcon sx={{ fontSize: 18 }} />
            </IconWrap>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                Nhắc hẹn
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                {remindersCount > 0 ? `${remindersCount} lịch nhắc` : "Chưa có lịch hẹn"}
              </Typography>
            </Box>
          </ItemLeft>
          {onOpenCreateReminder && (
            <Tooltip title="Tạo lịch nhắc hẹn">
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={onOpenCreateReminder}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.4,
                  px: 1.2,
                  borderRadius: 1.5,
                  bgcolor: "#FEF3C7",
                  color: "#B45309",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#FDE68A" },
                }}
              >
                Tạo
              </Button>
            </Tooltip>
          )}
        </BoardItem>

        <Divider sx={{ mx: 2.5, my: 0.5 }} />

        {/* Notes */}
        <BoardItem>
          <ItemLeft>
            <IconWrap bgcolor="#F0FDF4" textcolor="#16A34A">
              <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
            </IconWrap>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                Ghi chú nhóm
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                {notesCount > 0 ? `${notesCount} bảng ghi chú` : "Chưa có ghi chú"}
              </Typography>
            </Box>
          </ItemLeft>
          {onOpenCreateNote && (
            <Tooltip title="Tạo ghi chú mới">
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={onOpenCreateNote}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.4,
                  px: 1.2,
                  borderRadius: 1.5,
                  bgcolor: "#F0FDF4",
                  color: "#15803D",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#DCFCE7" },
                }}
              >
                Tạo
              </Button>
            </Tooltip>
          )}
        </BoardItem>

        <Divider sx={{ mx: 2.5, my: 0.5 }} />

        {/* To-Do */}
        <BoardItem>
          <ItemLeft>
            <IconWrap bgcolor="#FAF5FF" textcolor="#9333EA">
              <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 18 }} />
            </IconWrap>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                Giao việc (Zalo To-Do)
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                {todosCount > 0 ? `${todosCount} đầu việc` : "Chưa có công việc"}
              </Typography>
            </Box>
          </ItemLeft>
          {onOpenCreateTodo && (
            <Tooltip title="Giao đầu việc mới">
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={onOpenCreateTodo}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  py: 0.4,
                  px: 1.2,
                  borderRadius: 1.5,
                  bgcolor: "#FAF5FF",
                  color: "#7E22CE",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#F3E8FF" },
                }}
              >
                Giao việc
              </Button>
            </Tooltip>
          )}
        </BoardItem>
      </Box>
    </SectionBlock>
  );
}
