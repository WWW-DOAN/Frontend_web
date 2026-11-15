"use client";

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
  Alert,
  Tooltip,
} from "@mui/material";
import { Close, ContentCopy, Refresh } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface InviteLinkModalProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
}

export default function InviteLinkModal({
  open,
  conversationId,
  onClose,
}: InviteLinkModalProps) {
  const [inviteLink, setInviteLink] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInviteLink = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await chatService.getGroupInviteLink(conversationId);
      const data = (res as any)?.data;
      setInviteCode(data?.inviteCode ?? "");
      const link =
        data?.inviteLink ??
        (data?.inviteCode
          ? `${window.location.origin}/join-group/${data.inviteCode}`
          : "");
      setInviteLink(link);
    } catch {
      setError("Không thể tải liên kết mời. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && conversationId) {
      fetchInviteLink();
    }
  }, [open, conversationId]);

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast.success("Đã sao chép liên kết");
    });
  };

  const handleReset = async () => {
    if (!confirm("Đặt lại liên kết? Liên kết cũ sẽ không còn hoạt động.")) return;
    setIsResetting(true);
    try {
      const res = await chatService.resetGroupInviteLink(conversationId);
      const data = (res as any)?.data;
      setInviteCode(data?.inviteCode ?? "");
      const link =
        data?.inviteLink ??
        (data?.inviteCode
          ? `${window.location.origin}/join-group/${data.inviteCode}`
          : "");
      setInviteLink(link);
      toast.success("Đã đặt lại liên kết mời");
    } catch {
      toast.error("Không thể đặt lại liên kết");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography fontWeight={600}>Mời vào nhóm bằng liên kết</Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" action={
            <Button size="small" onClick={fetchInviteLink}>Thử lại</Button>
          }>
            {error}
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Chia sẻ liên kết này để mời người dùng vào nhóm. Bất kỳ ai có liên kết đều có thể tham gia.
            </Typography>

            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={inviteLink}
                InputProps={{ readOnly: true }}
                sx={{ "& .MuiInputBase-input": { fontSize: "13px" } }}
              />
              <Tooltip title="Sao chép liên kết">
                <IconButton onClick={handleCopy} color="primary">
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>

            {inviteCode && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Mã mời:
                </Typography>
                <Typography
                  variant="caption"
                  fontFamily="monospace"
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: "#F3F4F6",
                    letterSpacing: "0.1em",
                  }}
                >
                  {inviteCode}
                </Typography>
              </Box>
            )}

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <Button
                startIcon={<Refresh />}
                size="small"
                color="warning"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? "Đang đặt lại..." : "Đặt lại liên kết"}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={handleCopy}
          startIcon={<ContentCopy />}
          disabled={!inviteLink}
        >
          Sao chép liên kết
        </Button>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
