"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";
import { chatService } from "@/src/common/service/chat-service";

interface CreatePollModalProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onCreated?: () => void;
}

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 12,
    maxWidth: 480,
    width: "100%",
  },
});

export default function CreatePollModal({
  open,
  conversationId,
  onClose,
  onCreated,
}: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowAddOption, setAllowAddOption] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setAllowAddOption(true);
    setIsAnonymous(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleAddOption = () => {
    if (options.length >= 10) {
      toast.warning("Tối đa 10 lựa chọn");
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.warning("Cần tối thiểu 2 lựa chọn");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      toast.error("Vui lòng nhập câu hỏi bình chọn");
      return;
    }

    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (trimmedOptions.length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 phương án bình chọn");
      return;
    }

    setSubmitting(true);
    try {
      await chatService.createPoll(conversationId, {
        question: trimmedQuestion,
        options: trimmedOptions,
        allow_multiple: allowMultiple,
        allow_add_option: allowAddOption,
        is_anonymous: isAnonymous,
      });
      toast.success("Tạo bình chọn thành công");
      handleClose();
      onCreated?.();
    } catch (err: any) {
      console.error("Create poll failed:", err);
      toast.error(err?.response?.data?.message || "Không thể tạo bình chọn");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StyledDialog open={open} onClose={handleClose}>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 600,
          fontSize: 18,
          borderBottom: "1px solid #E5E7EB",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PollOutlinedIcon color="primary" />
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
            Tạo cuộc bình chọn
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={submitting}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, color: "#374151" }}>
              Câu hỏi bình chọn *
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Đặt câu hỏi bình chọn..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, color: "#374151" }}>
              Các phương án lựa chọn *
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {options.map((opt, idx) => (
                <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Phương án ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    disabled={submitting}
                  />
                  {options.length > 2 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={submitting}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            {options.length < 10 && (
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={handleAddOption}
                disabled={submitting}
                sx={{ mt: 1, textTransform: "none", fontSize: 13 }}
              >
                Thêm phương án
              </Button>
            )}
          </Box>

          <Box sx={{ borderTop: "1px solid #F3F4F6", pt: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, color: "#374151" }}>
              Cài đặt bình chọn
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  disabled={submitting}
                />
              }
              label={<Typography sx={{ fontSize: 13 }}>Chọn nhiều phương án</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={allowAddOption}
                  onChange={(e) => setAllowAddOption(e.target.checked)}
                  disabled={submitting}
                />
              }
              label={<Typography sx={{ fontSize: 13 }}>Người khác có thể thêm phương án mới</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  disabled={submitting}
                />
              }
              label={<Typography sx={{ fontSize: 13 }}>Bình chọn ẩn danh</Typography>}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #E5E7EB" }}>
        <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ textTransform: "none", minWidth: 100 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : "Tạo bình chọn"}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}
