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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Close, Alarm } from "@mui/icons-material";
import { useState } from "react";
import { ChatAttachmentPayload } from "@/src/common/interface/media-interface";

interface CreateReminderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (content: string, attachments: ChatAttachmentPayload[], pin?: boolean) => void;
}

export default function CreateReminderModal({
  open,
  onClose,
  onCreated,
}: CreateReminderModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState("NONE");
  const [note, setNote] = useState("");
  const [pinToTop, setPinToTop] = useState(true);

  const handleCreate = () => {
    if (!title.trim()) return;

    const repeatLabels: Record<string, string> = {
      NONE: "Không lặp",
      DAILY: "Hàng ngày",
      WEEKLY: "Hàng tuần",
      MONTHLY: "Hàng tháng",
    };

    const reminderPayload: ChatAttachmentPayload = {
      type: "reminder",
      name: title.trim(),
      metadata: {
        title: title.trim(),
        dateTime: `${date} ${time}`,
        repeat,
        repeatLabel: repeatLabels[repeat] || "Không lặp",
        note: note.trim(),
        pinToTop,
      },
    };

    const messageText = `Nhắc hẹn: ${title.trim()} (${date} lúc ${time} - ${repeatLabels[repeat]})`;
    onCreated(messageText, [reminderPayload], pinToTop);
    setTitle("");
    setNote("");
    setPinToTop(true);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Alarm color="primary" />
          <Typography fontWeight={600}>Tạo nhắc hẹn nhóm</Typography>
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
          label="Nội dung nhắc hẹn"
          placeholder="Ví dụ: Họp nhóm tuần, Nộp báo cáo..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            label="Ngày"
            type="date"
            fullWidth
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Giờ"
            type="time"
            fullWidth
            value={time}
            onChange={(e) => setTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel>Lặp lại</InputLabel>
          <Select
            value={repeat}
            label="Lặp lại"
            onChange={(e) => setRepeat(e.target.value)}
          >
            <MenuItem value="NONE">Không lặp lại</MenuItem>
            <MenuItem value="DAILY">Hàng ngày</MenuItem>
            <MenuItem value="WEEKLY">Hàng tuần</MenuItem>
            <MenuItem value="MONTHLY">Hàng tháng</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Ghi chú thêm (không bắt buộc)"
          placeholder="Thêm mô tả hoặc link tài liệu..."
          multiline
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <FormControlLabel
          control={<Checkbox checked={pinToTop} onChange={(e) => setPinToTop(e.target.checked)} color="primary" />}
          label={<Typography fontSize={13}>Ghim lên đầu cuộc trò chuyện</Typography>}
          sx={{ mt: 0.5 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!title.trim()}
        >
          Tạo nhắc hẹn
        </Button>
      </DialogActions>
    </Dialog>
  );
}
