"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Chip,
  CircularProgress,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";
import { chatbotService } from "@/src/common/service/chatbot-service";

interface ImageAiDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
}

const QUICK_PROMPTS = [
  { label: "📝 Quét toàn bộ chữ (OCR)", prompt: "Hãy quét và trích xuất toàn bộ văn bản tiếng Việt/Anh trong ảnh một cách đầy đủ và chính xác nhất." },
  { label: "🧾 Phân tích hóa đơn", prompt: "Hãy phân tích hóa đơn/phiếu thu này: lập bảng chi tiết từng món/dịch vụ, đơn giá, số lượng và tổng tiền thanh toán." },
  { label: "💡 Giải thích & Tóm tắt", prompt: "Hãy phân tích và tóm tắt nội dung chính của bức ảnh này một cách dễ hiểu và trực quan." },
  { label: "💻 Sửa & Giải thích code", prompt: "Hãy đọc đoạn code trong ảnh, phân tích logic, chỉ ra lỗi (nếu có) và viết lại code chuẩn." },
];

export const ImageAiDialog: React.FC<ImageAiDialogProps> = ({
  open,
  onClose,
  imageUrl,
  imageName,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (customPrompt?: string) => {
    const textPrompt = customPrompt !== undefined ? customPrompt : prompt;
    if (!imageUrl) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await chatbotService.visionQa({
        imageUrl,
        prompt: textPrompt.trim() || undefined,
      });

      if (res.data?.success && res.data.data?.answer) {
        setResult(res.data.data.answer);
      } else {
        toast.error("Không thể phân tích ảnh lúc này");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi kết nối với ZAi Multimodal");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Đã sao chép kết quả vào bộ nhớ tạm");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
          color: "#fff",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            Trợ lý ZAi Thị Giác (Multimodal OCR & Q&A)
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.5 }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2.5 }}>
        {/* Left Column: Image preview */}
        <Box
          sx={{
            flex: { xs: "none", md: "0 0 280px" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            component="img"
            src={imageUrl}
            alt={imageName || "Ảnh phân tích"}
            sx={{
              width: "100%",
              maxHeight: 280,
              objectFit: "contain",
              borderRadius: 2,
              border: "1px solid #E2E8F0",
              bgcolor: "#F8FAFC",
            }}
          />
          <Typography sx={{ fontSize: 12, color: "#64748B", mt: 1, textAlign: "center" }}>
            {imageName || "Hình ảnh đã chọn"}
          </Typography>
        </Box>

        {/* Right Column: Interaction & Result */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155", mb: 1 }}>
            Chọn tác vụ nhanh hoặc đặt câu hỏi tùy ý:
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 1.5 }}>
            {QUICK_PROMPTS.map((item, idx) => (
              <Chip
                key={idx}
                label={item.label}
                clickable
                onClick={() => {
                  setPrompt(item.prompt);
                  handleAnalyze(item.prompt);
                }}
                disabled={loading}
                sx={{
                  bgcolor: "#F1F5F9",
                  fontSize: 12,
                  fontWeight: 500,
                  "&:hover": { bgcolor: "#E2E8F0" },
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Hỏi ZAi về bức ảnh này..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
              disabled={loading}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <Button
              variant="contained"
              onClick={() => handleAnalyze()}
              disabled={loading}
              sx={{
                background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                borderRadius: 2,
                px: 2.5,
                fontWeight: 600,
                textTransform: "none",
                flexShrink: 0,
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Phân tích"}
            </Button>
          </Box>

          {/* Result Area */}
          <Box
            sx={{
              flex: 1,
              minHeight: 200,
              maxHeight: 340,
              overflowY: "auto",
              bgcolor: "#F8FAFC",
              borderRadius: 2,
              p: 2,
              border: "1px solid #E2E8F0",
              position: "relative",
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.5, py: 4 }}>
                <CircularProgress size={32} sx={{ color: "#7C3AED" }} />
                <Typography sx={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
                  ZAi đang quan sát và trích xuất thông tin ảnh...
                </Typography>
              </Box>
            ) : result ? (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, pb: 0.5, borderBottom: "1px solid #E2E8F0" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>
                    ✨ KẾT QUẢ TỪ TRỢ LÝ ZAi:
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleCopy}
                    startIcon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    sx={{ textTransform: "none", fontSize: 11, color: copied ? "#16A34A" : "#64748B" }}
                  >
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </Button>
                </Box>
                <Box
                  sx={{
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: "#1E293B",
                    "& table": { borderCollapse: "collapse", width: "100%", my: 1 },
                    "& th,& td": { border: "1px solid #CBD5E1", p: "4px 8px", fontSize: 12 },
                    "& th": { bgcolor: "#E2E8F0", fontWeight: 600 },
                    "& pre": { bgcolor: "#1E293B", color: "#F8FAFC", p: 1.5, borderRadius: 1.5, overflowX: "auto" },
                    "& code": { fontFamily: "monospace", fontSize: 12 },
                  }}
                >
                  <ReactMarkdown>{result}</ReactMarkdown>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", py: 4, color: "#94A3B8" }}>
                <AutoAwesomeIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
                <Typography sx={{ fontSize: 13 }}>
                  Bấm một tác vụ nhanh hoặc gõ câu hỏi để ZAi bắt đầu quét ảnh
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
        <Button onClick={onClose} sx={{ color: "#64748B", textTransform: "none", fontWeight: 600 }}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};
