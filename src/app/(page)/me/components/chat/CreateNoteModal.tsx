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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Close, Description } from "@mui/icons-material";
import { useState } from "react";
import { ChatAttachmentPayload } from "@/src/common/interface/media-interface";

interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (content: string, attachments: ChatAttachmentPayload[], pin?: boolean) => void;
}

export default function CreateNoteModal({
  open,
  onClose,
  onCreated,
}: CreateNoteModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinToTop, setPinToTop] = useState(true);

  const handleCreate = () => {
    if (!title.trim() && !body.trim()) return;

    const notePayload: ChatAttachmentPayload = {
      type: "note",
      name: title.trim() || "Ghi chú nhóm",
      metadata: {
        title: title.trim(),
        content: body.trim(),
        pinToTop,
      },
    };

    const messageText = `📝 Ghi chú: ${title.trim()}\n${body.trim()}`;
    onCreated(messageText, [notePayload], pinToTop);
    setTitle("");
    setBody("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Description color="primary" />
          <Typography fontWeight={600}>Tạo ghi chú nhóm</Typography>
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
          label="Tiêu đề ghi chú"
          placeholder="Ví dụ: Nội quy nhóm, Thông tin tài khoản..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <TextField
          fullWidth
          label="Nội dung chi tiết"
          placeholder="Nhập nội dung thông báo hoặc văn bản dài..."
          multiline
          minRows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={pinToTop}
              onChange={(e) => setPinToTop(e.target.checked)}
              color="primary"
            />
          }
          label="Ghim lên đầu bảng tin nhóm"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!title.trim() && !body.trim()}
        >
          Lưu ghi chú
        </Button>
      </DialogActions>
    </Dialog>
  );
}
