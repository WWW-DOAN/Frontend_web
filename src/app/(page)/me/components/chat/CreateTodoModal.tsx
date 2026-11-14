"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
} from "@mui/material";
import { Close, AssignmentTurnedIn } from "@mui/icons-material";
import { useState } from "react";
import { ChatAttachmentPayload } from "@/src/common/interface/media-interface";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";

interface CreateTodoModalProps {
  open: boolean;
  members: Array<{ userId: string; displayName?: string; fullName?: string; username?: string; avatarUrl?: string }>;
  onClose: () => void;
  onCreated: (content: string, attachments: ChatAttachmentPayload[]) => void;
}

export default function CreateTodoModal({
  open,
  members,
  onClose,
  onCreated,
}: CreateTodoModalProps) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [dueTime, setDueTime] = useState("18:00");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;

    const assignedMember = members.find((m) => m.userId === assigneeId);
    const assigneeName = assignedMember?.displayName || assignedMember?.fullName || assignedMember?.username || "Chưa giao";

    const todoPayload: ChatAttachmentPayload = {
      type: "todo",
      name: title.trim(),
      metadata: {
        title: title.trim(),
        assigneeId,
        assigneeName,
        assigneeAvatar: assignedMember?.avatarUrl,
        dueDate: `${dueDate} ${dueTime}`,
        description: description.trim(),
        status: "PENDING",
      },
    };

    const messageText = `📋 Giao việc: ${title.trim()} -> ${assigneeName} (Hạn chót: ${dueDate} ${dueTime})`;
    onCreated(messageText, [todoPayload]);
    setTitle("");
    setDescription("");
    setAssigneeId("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AssignmentTurnedIn color="primary" />
          <Typography fontWeight={600}>Giao việc (Zalo To-Do)</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          autoFocus
          fullWidth
          label="Tên công việc"
          placeholder="Ví dụ: Thiết kế banner, Soạn hợp đồng..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Người thực hiện</InputLabel>
          <Select
            value={assigneeId}
            label="Người thực hiện"
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <MenuItem value="">
              <em>Chưa giao cho ai</em>
            </MenuItem>
            {members.map((m) => {
              const name = m.displayName || m.fullName || m.username || m.userId;
              return (
                <MenuItem key={m.userId} value={m.userId}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar
                      src={resolveMediaUrl(m.avatarUrl) || undefined}
                      sx={{ width: 24, height: 24, fontSize: 12 }}
                    >
                      {name[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2">{name}</Typography>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="Hạn hoàn thành"
            type="date"
            fullWidth
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Giờ"
            type="time"
            fullWidth
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <TextField
          fullWidth
          label="Chi tiết công việc"
          placeholder="Mô tả tiêu chuẩn hoàn thành, tài liệu đính kèm..."
          multiline
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!title.trim()}
        >
          Giao việc
        </Button>
      </DialogActions>
    </Dialog>
  );
}
