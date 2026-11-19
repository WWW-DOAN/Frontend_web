"use client";

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
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useState } from "react";
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
  const [question, setQuestion] = useState(poll?.question ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Reset when poll changes
  if (poll && question !== poll.question && !isSaving) {
    setQuestion(poll.question);
  }

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
    } catch {
      toast.error("Không thể cập nhật cuộc bình chọn");
    } finally {
      setIsSaving(false);
    }
  };

  if (!poll) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography fontWeight={600}>Chỉnh sửa cuộc bình chọn</Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            fullWidth
            label="Câu hỏi"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            multiline
            minRows={2}
            inputProps={{ maxLength: 300 }}
            helperText={`${question.length}/300`}
          />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Các lựa chọn hiện tại
            </Typography>
            {poll.options.map((opt, idx) => (
              <Box
                key={opt.id}
                sx={{
                  px: 2,
                  py: 1,
                  mb: 1,
                  borderRadius: 1,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                  {idx + 1}.
                </Typography>
                <Typography variant="body2">{opt.label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                  {opt.votes} phiếu
                </Typography>
              </Box>
            ))}
            <Typography variant="caption" color="text.secondary">
              * Chỉ có thể chỉnh sửa câu hỏi. Để thêm/xóa lựa chọn, hãy dùng nút trong bình chọn.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!question.trim() || question === poll.question || isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
