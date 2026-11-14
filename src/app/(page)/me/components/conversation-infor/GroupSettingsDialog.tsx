"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { styled } from "@mui/material/styles";
import { toast } from "react-toastify";
import { chatService } from "@/src/common/service/chat-service";
import { useChatStore } from "@/src/common/store/useChatStore";

interface GroupSettingsDialogProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  isAdmin: boolean;
}

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 12,
    maxWidth: 480,
    width: "100%",
  },
});

const SettingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 0",
});

export default function GroupSettingsDialog({
  open,
  conversationId,
  onClose,
  isAdmin,
}: GroupSettingsDialogProps) {
  const listConversation = useChatStore((s) => s.listConversation);
  const fetchListConversation = useChatStore((s) => s.fetchListConversation);
  const conversation = listConversation.find((c) => c.id === conversationId);

  const [canSendMessage, setCanSendMessage] = useState(true);
  const [canAddMembers, setCanAddMembers] = useState(true);
  const [canCreatePolls, setCanCreatePolls] = useState(true);
  const [inviteApproval, setInviteApproval] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conversation?.settings) {
      const perms = conversation.settings.permissions;
      const policies = conversation.settings.policies;
      if (perms) {
        setCanSendMessage(perms.canSendMessage !== false);
        setCanAddMembers(perms.canAddMembers !== false);
        setCanCreatePolls(perms.canCreatePolls !== false);
      }
      if (policies) {
        setInviteApproval(Boolean(policies.inviteApproval));
      }
    }
  }, [conversation]);

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("Chỉ quản trị viên mới có quyền thay đổi cài đặt nhóm");
      return;
    }

    setSaving(true);
    try {
      await chatService.updateGroupSettings(conversationId, {
        permissions: {
          canSendMessage,
          canAddMembers,
          canCreatePolls,
        },
        policies: {
          inviteApproval,
        },
      });
      toast.success("Cập nhật cài đặt nhóm thành công");
      await fetchListConversation({ page: 1, limit: 20 });
      onClose();
    } catch (err: any) {
      console.error("Failed to update group settings:", err);
      toast.error(err?.response?.data?.message || "Không thể cập nhật cài đặt nhóm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledDialog open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 16,
          borderBottom: "1px solid #E5E7EB",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SettingsOutlinedIcon color="primary" />
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
            Quản trị & Cài đặt nhóm
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <Typography sx={{ fontSize: 13, color: "#6B7280", mb: 2 }}>
          Thiết lập các quyền hạn và chính sách cho các thành viên trong nhóm.
        </Typography>

        <SettingRow>
          <Box sx={{ pr: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Gửi tin nhắn
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              Cho phép tất cả thành viên gửi tin nhắn trong nhóm
            </Typography>
          </Box>
          <Switch
            checked={canSendMessage}
            onChange={(e) => setCanSendMessage(e.target.checked)}
            disabled={!isAdmin || saving}
            color="primary"
          />
        </SettingRow>

        <Divider />

        <SettingRow>
          <Box sx={{ pr: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Thêm thành viên
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              Cho phép tất cả thành viên thêm người mới vào nhóm
            </Typography>
          </Box>
          <Switch
            checked={canAddMembers}
            onChange={(e) => setCanAddMembers(e.target.checked)}
            disabled={!isAdmin || saving}
            color="primary"
          />
        </SettingRow>

        <Divider />

        <SettingRow>
          <Box sx={{ pr: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Tạo cuộc bình chọn
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              Cho phép thành viên tạo bình chọn ý kiến
            </Typography>
          </Box>
          <Switch
            checked={canCreatePolls}
            onChange={(e) => setCanCreatePolls(e.target.checked)}
            disabled={!isAdmin || saving}
            color="primary"
          />
        </SettingRow>

        <Divider />

        <SettingRow>
          <Box sx={{ pr: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Duyệt thành viên mới
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              Yêu cầu quản trị viên phê duyệt trước khi thành viên mới tham gia
            </Typography>
          </Box>
          <Switch
            checked={inviteApproval}
            onChange={(e) => setInviteApproval(e.target.checked)}
            disabled={!isAdmin || saving}
            color="primary"
          />
        </SettingRow>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #E5E7EB" }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isAdmin || saving}
          sx={{ textTransform: "none", minWidth: 100 }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}
