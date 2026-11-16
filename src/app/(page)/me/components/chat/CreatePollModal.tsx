"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import PlaylistAddOutlinedIcon from "@mui/icons-material/PlaylistAddOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";
import { chatService } from "@/src/common/service/chat-service";
import type { ConversationPoll } from "@/src/common/interface/conversation-interface";

interface CreatePollModalProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onCreated?: (poll?: ConversationPoll, pinToTop?: boolean) => void;
}

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 14,
    maxWidth: 500,
    width: "100%",
    maxHeight: "88vh",
  },
});

const SettingToggleRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
});

const DURATION_OPTIONS = [
  { value: 0, label: "Không giới hạn" },
  { value: 1, label: "1 giờ" },
  { value: 6, label: "6 giờ" },
  { value: 24, label: "24 giờ (1 ngày)" },
  { value: 72, label: "3 ngày" },
  { value: 168, label: "7 ngày" },
];

export default function CreatePollModal({
  open,
  conversationId,
  onClose,
  onCreated,
}: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [expiresInHours, setExpiresInHours] = useState<number>(0);
  const [pinToTop, setPinToTop] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowAddOption, setAllowAddOption] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const optionInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setExpiresInHours(0);
    setPinToTop(true);
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
    if (options.length >= 15) {
      toast.warning("Tối đa 15 phương án bình chọn");
      return;
    }
    const nextIndex = options.length;
    setOptions((prev) => [...prev, ""]);
    setTimeout(() => {
      optionInputRefs.current[nextIndex]?.focus();
    }, 30);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.warning("Cần tối thiểu 2 phương án");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const getDeadlinePreview = () => {
    if (!expiresInHours) return "Bình chọn mở cho đến khi được khóa thủ công";
    const end = new Date(Date.now() + expiresInHours * 3600 * 1000);
    return `Kết thúc lúc ${end.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} ngày ${end.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  };

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      toast.error("Vui lòng nhập chủ đề bình chọn");
      return;
    }

    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (trimmedOptions.length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 phương án lựa chọn");
      return;
    }

    const uniqueOptions = Array.from(new Set(trimmedOptions.map((o) => o.toLowerCase())));
    if (uniqueOptions.length < trimmedOptions.length) {
      toast.warning("Các phương án không được trùng lặp hoàn toàn");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await chatService.createPoll(conversationId, {
        question: trimmedQuestion,
        options: trimmedOptions,
        allow_multiple: allowMultiple,
        allow_add_option: allowAddOption,
        is_anonymous: isAnonymous,
        ...(expiresInHours > 0 ? { expires_in_hours: expiresInHours } : {}),
      });
      const createdPoll: ConversationPoll | undefined =
        res?.payload?.data ?? res?.payload ?? res?.data ?? res;
      toast.success("Đã tạo bình chọn");
      const shouldPin = pinToTop;
      handleClose();
      onCreated?.(createdPoll, shouldPin);
    } catch (err: any) {
      console.error("Create poll failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Không thể tạo bình chọn");
    } finally {
      setSubmitting(false);
    }
  };

  const validOptionCount = options.map((o) => o.trim()).filter(Boolean).length;

  return (
    <StyledDialog open={open} onClose={handleClose} fullWidth>
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
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: "#EFF6FF",
              color: "#0068FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PollOutlinedIcon sx={{ fontSize: 19 }} />
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Tạo bình chọn
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={submitting}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2, bgcolor: "#F9FAFB" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Topic / Question */}
          <Box sx={{ bgcolor: "#FFFFFF", p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                Chủ đề bình chọn
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "#9CA3AF" }}>
                {question.length}/200
              </Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              placeholder="Đặt câu hỏi bình chọn..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              disabled={submitting}
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontSize: 14,
                  bgcolor: "#F9FAFB",
                },
              }}
            />
          </Box>

          {/* Options */}
          <Box sx={{ bgcolor: "#FFFFFF", p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#111827", mb: 1 }}>
              Các lựa chọn
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {options.map((opt, idx) => (
                <TextField
                  key={idx}
                  fullWidth
                  size="small"
                  inputRef={(el) => {
                    optionInputRefs.current[idx] = el;
                  }}
                  placeholder={`Lựa chọn ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (idx === options.length - 1 && options.length < 15) {
                        handleAddOption();
                      }
                    }
                  }}
                  slotProps={{
                    htmlInput: { maxLength: 150 },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              bgcolor: "#EFF6FF",
                              color: "#0068FF",
                              fontSize: 11.5,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {idx + 1}
                          </Box>
                        </InputAdornment>
                      ),
                      endAdornment: options.length > 2 ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveOption(idx)}
                            disabled={submitting}
                            sx={{ color: "#9CA3AF", "&:hover": { color: "#EF4444" } }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                  disabled={submitting}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      fontSize: 13.5,
                    },
                  }}
                />
              ))}
            </Box>

            {options.length < 15 && (
              <Button
                startIcon={<AddRoundedIcon />}
                size="small"
                onClick={handleAddOption}
                disabled={submitting}
                sx={{
                  mt: 1.25,
                  textTransform: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0068FF",
                  px: 1,
                }}
              >
                Thêm lựa chọn
              </Button>
            )}
          </Box>

          {/* Deadline + Settings */}
          <Box sx={{ bgcolor: "#FFFFFF", p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                pb: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 1.5,
                    bgcolor: "#FEF3C7",
                    color: "#D97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TimerOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                    Thời hạn bình chọn
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#6B7280" }}>
                    {getDeadlinePreview()}
                  </Typography>
                </Box>
              </Box>
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <Select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  disabled={submitting}
                  sx={{ fontSize: 13, borderRadius: 2 }}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <SettingToggleRow>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <PushPinOutlinedIcon sx={{ fontSize: 18, color: "#EA580C" }} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                    Ghim lên đầu trò chuyện
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#6B7280" }}>
                    Hiển thị nổi bật để thành viên dễ theo dõi và bình chọn
                  </Typography>
                </Box>
              </Box>
              <Switch
                size="small"
                checked={pinToTop}
                onChange={(e) => setPinToTop(e.target.checked)}
                disabled={submitting}
              />
            </SettingToggleRow>

            <SettingToggleRow>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <CheckBoxOutlinedIcon sx={{ fontSize: 18, color: "#0068FF" }} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                    Chọn nhiều phương án
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#6B7280" }}>
                    Thành viên có thể chọn đồng thời nhiều đáp án
                  </Typography>
                </Box>
              </Box>
              <Switch
                size="small"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                disabled={submitting}
              />
            </SettingToggleRow>

            <SettingToggleRow>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <PlaylistAddOutlinedIcon sx={{ fontSize: 18, color: "#059669" }} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                    Cho phép thành viên thêm phương án
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#6B7280" }}>
                    Thành viên khác có thể bổ sung thêm lựa chọn mới
                  </Typography>
                </Box>
              </Box>
              <Switch
                size="small"
                checked={allowAddOption}
                onChange={(e) => setAllowAddOption(e.target.checked)}
                disabled={submitting}
              />
            </SettingToggleRow>

            <SettingToggleRow>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: "#6B7280" }} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                    Ẩn danh người bình chọn
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#6B7280" }}>
                    Không hiển thị tên và ảnh của người đã bình chọn
                  </Typography>
                </Box>
              </Box>
              <Switch
                size="small"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                disabled={submitting}
              />
            </SettingToggleRow>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #E5E7EB", bgcolor: "#FFFFFF" }}>
        <Button onClick={handleClose} disabled={submitting} sx={{ textTransform: "none", fontWeight: 600 }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !question.trim() || validOptionCount < 2}
          sx={{
            textTransform: "none",
            minWidth: 130,
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: "#0068FF",
            "&:hover": { bgcolor: "#0052CC" },
          }}
        >
          {submitting ? <CircularProgress size={18} color="inherit" /> : "Tạo bình chọn"}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}
