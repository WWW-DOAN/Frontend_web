"use client";

import { useEffect, useState } from "react";
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
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Radio,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import { styled } from "@mui/material/styles";
import { useFriendStore } from "@/src/common/store/useFriendStore";

interface ShareContactModalProps {
  open: boolean;
  onClose: () => void;
  onShare: (contact: { userId: string; displayName: string; avatarUrl?: string; phone?: string }) => void;
}

const StyledDialog = styled(Dialog)({
  "& .MuiDialog-paper": {
    borderRadius: 12,
    maxWidth: 440,
    width: "100%",
  },
});

export default function ShareContactModal({
  open,
  onClose,
  onShare,
}: ShareContactModalProps) {
  const { friends, loadingFriends, fetchFriends } = useFriendStore();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchFriends();
      setSelectedId(null);
      setSearch("");
    }
  }, [open, fetchFriends]);

  const filteredFriends = friends.filter((f) => {
    const q = search.toLowerCase();
    return (
      (f.displayName || f.fullName || "").toLowerCase().includes(q) ||
      (f.phone || "").includes(q)
    );
  });

  const handleShare = () => {
    if (!selectedId) return;
    const friend = friends.find((f) => f.id === selectedId);
    if (!friend) return;

    onShare({
      userId: friend.id,
      displayName: friend.displayName || friend.fullName || "Người dùng Zalo",
      avatarUrl: friend.avatarUrl || undefined,
      phone: friend.phone || undefined,
    });
    onClose();
  };

  return (
    <StyledDialog open={open} onClose={onClose}>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 600,
          fontSize: 16,
          borderBottom: "1px solid #E5E7EB",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ContactPhoneIcon color="primary" />
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
            Chia sẻ danh thiếp
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Tìm bạn bè theo tên hoặc số điện thoại..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "#9CA3AF" }} />
              </InputAdornment>
            ),
          }}
        />

        {loadingFriends ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredFriends.length === 0 ? (
          <Typography sx={{ textAlign: "center", color: "#6B7280", py: 4, fontSize: 14 }}>
            {search ? "Không tìm thấy bạn bè phù hợp" : "Danh sách bạn bè trống"}
          </Typography>
        ) : (
          <List sx={{ maxHeight: 280, overflowY: "auto", p: 0 }}>
            {filteredFriends.map((friend) => (
              <ListItem
                key={friend.id}
                onClick={() => setSelectedId(friend.id)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  cursor: "pointer",
                  bgcolor: selectedId === friend.id ? "#EBF5FF" : "transparent",
                  "&:hover": { bgcolor: selectedId === friend.id ? "#EBF5FF" : "#F3F4F6" },
                }}
              >
                <ListItemAvatar>
                  <Avatar src={friend.avatarUrl || undefined}>
                    {(friend.displayName || "?")[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {friend.displayName || friend.fullName}
                    </Typography>
                  }
                  secondary={
                    <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                      {friend.phone || `@${friend.fullName || "zalo"}`}
                    </Typography>
                  }
                />
                <Radio
                  checked={selectedId === friend.id}
                  value={friend.id}
                  size="small"
                  onChange={() => setSelectedId(friend.id)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #E5E7EB" }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleShare}
          disabled={!selectedId}
          sx={{ textTransform: "none", minWidth: 100 }}
        >
          Chia sẻ
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}
