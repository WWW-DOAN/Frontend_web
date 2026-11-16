"use client";

import { useEffect, useState } from "react";
import { ConversationPoll } from "@/src/common/interface/conversation-interface";
import { chatService } from "@/src/common/service/chat-service";
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
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import { toast } from "react-toastify";

interface EditPollModalProps {
  open: boolean;
  poll: ConversationPoll | null;
  conversationId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditPollModal({
  open,
  poll,
  conversationId,
  onClose,
  onUpdated,
}: EditPollModalProps) {
  const [question, setQuestion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && poll) {
      setQuestion(poll.question || "");
    }
  }, [open, poll]);

  const handleSave = async () => {
    if (!poll || !question.trim()) return;
    setIsSaving(true);
    try {
      await chatService.updatePoll(conversationId, poll.id, {
        question: question.trim(),
      });
      toast.success("Đã cập nhật câu hỏi bình chọn");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể cập nhật cuộc bình chọn");
    } finally {
      setIsSaving(false);
    }
  };

  if (!poll) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PollOutlinedIcon sx={{ color: "#0068FF", fontSize: 22 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            Chỉnh sửa bình chọn
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isSaving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2, px: 2.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            fullWidth
            label="Chủ đề bình chọn"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            slotProps={{ htmlInput: { maxLength: 300 } }}
            helperText={`${question.length}/300`}
            disabled={isSaving}
          />

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#374151", mb: 1 }}>
              Các phương án hiện tại ({poll.options.length})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {poll.options.map((opt, idx) => (
                <Box
                  key={opt.id}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    border: "1px solid #E5E7EB",
                    backgroundColor: "#F9FAFB",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, color: "#6B7280", minWidth: 20, fontWeight: 600 }}>
                    {idx + 1}.
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: "#111827", flex: 1 }}>{opt.label}</Typography>
                  <Typography sx={{ fontSize: 12, color: "#0068FF", fontWeight: 600 }}>
                    {opt.votes} phiếu
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "#6B7280", mt: 1, display: "block" }}>
              * Để thêm phương án mới, sử dụng nút &quot;+ Thêm phương án&quot; ngay trên thẻ bình chọn.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #E5E7EB" }}>
        <Button onClick={onClose} disabled={isSaving} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!question.trim() || isSaving}
          sx={{ textTransform: "none", minWidth: 110 }}
        >
          {isSaving ? <CircularProgress size={18} color="inherit" /> : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
