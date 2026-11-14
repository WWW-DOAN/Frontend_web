"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Box,
  Button,
  Chip,
  ClickAwayListener,
  Dialog,
  DialogContent,
  DialogTitle,
  Fade,
  IconButton,
  ImageList,
  ImageListItem,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Slider,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled, alpha, keyframes } from "@mui/material/styles";
import { getReplyPreview } from "@/src/common/helpers/displayPreviewReply";
import type { ReactionDto } from "@/src/common/interface/chat-interface";
import { useChatStore } from "@/src/common/store/useChatStore";
import { chatService } from "@/src/common/service/chat-service";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";

import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import ForwardOutlinedIcon from "@mui/icons-material/ForwardOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import FileAttachmentCard from "./FileAttachmentCard";
import LinkPreviewCard from "./LinkPreviewCard";
import AlarmIcon from "@mui/icons-material/Alarm";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { buildS3Url } from "@/src/common/components/MediaPreviewModal";
import type { ConversationMemberDto } from "@/src/common/interface/chat-interface";

interface Attachment {
  key?: string;
  url?: string;
  thumbnailUrl?: string;
  type?: string;
  name?: string;
  size?: number;
  contentType?: string;
  content_type?: string;
  duration?: number;
}

interface MessageItemProps {
  id: string;
  content: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  isOwn?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  deliveryStatus?: "sending" | "sent" | "delivered" | "read" | "failed";
  isEdited?: boolean;
  isGrouped?: boolean;
  replyTo?: {
    messageId: string;
    body: string;
    senderId?: string;
    senderName?: string;
    attachments?: any[];
    isDeleted?: boolean;
  } | null;
  attachments?: Attachment[];
  reactions?: ReactionDto[];
  onReply?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onDelete?: () => void;
  onDeleteForMe?: () => void;
  onEdit?: (newContent: string) => void;
  onReact?: (emoji: string) => void;
  onImageClick?: (url: string, mediaList: Attachment[], index: number) => void;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const EmojiPickerBox = styled(Paper)({
  display: "flex",
  gap: 4,
  padding: "6px 10px",
  borderRadius: 999,
  boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
});

const EmojiBtn = styled(IconButton)({
  width: 32,
  height: 32,
  fontSize: 18,
  "&:hover": {
    backgroundColor: alpha("#0068FF", 0.08),
    transform: "scale(1.2)",
  },
  transition: "transform 0.15s ease",
});

const MessageRow = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "mine" && prop !== "isGrouped",
})<{
  mine?: boolean;
  isGrouped?: boolean;
}>(({ mine, isGrouped }) => ({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: mine ? "flex-end" : "flex-start",
  gap: 8,
  padding: "0 14px",
  marginTop: isGrouped ? 2 : 10,
  position: "relative",

  "&:hover .message-actions": {
    opacity: 1,
    visibility: "visible",
    transform: "translateY(0px)",
  },
}));

const MessageAvatar = styled(Avatar)({
  width: 32,
  height: 32,
  fontSize: 13,
  flexShrink: 0,
  marginBottom: 2,
});

const BubbleWrap = styled(Box, {
  shouldForwardProp: (prop) => prop !== "mine",
})<{ mine?: boolean }>(({ mine }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: mine ? "flex-end" : "flex-start",
  position: "relative",
}));

const flashAnimation = keyframes`
  0% {
    background-color: #fef08a !important; /* light yellow */
    border-color: #facc15 !important;
  }
  50% {
    background-color: #fef08a !important;
    border-color: #facc15 !important;
  }
  100% {
    /* transition back */
  }
`;

const Bubble = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "mine" && prop !== "isDeleted",
})<{
  mine?: boolean;
  isDeleted?: boolean;
}>(({ mine, isDeleted }) => ({
  position: "relative",
  maxWidth: "560px",
  minWidth: 70,
  padding: "9px 12px",
  borderRadius: mine
    ? "18px 18px 4px 18px"
    : "18px 18px 18px 4px",
  background: mine ? "#d9fdd3" : "#ffffff",
  border: mine
    ? "1px solid #c9f1c3"
    : "1px solid #E5E7EB",
  color: "#111827",
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  opacity: isDeleted ? 0.6 : 1,
  fontStyle: isDeleted ? "italic" : "normal",
  transition: "background-color 0.3s ease, border-color 0.3s ease",

  "&.flash-active": {
    animation: `${flashAnimation} 1.5s ease-in-out`,
  },
}));

const SenderName = styled(Typography)({
  fontSize: 12,
  fontWeight: 600,
  color: "#2563EB",
  marginBottom: 4,
});

const MessageText = styled(Typography)({
  fontSize: 14,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

const MetaRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginTop: 4,
});

const MetaText = styled(Typography)({
  fontSize: 11,
  color: "#94A3B8",
  lineHeight: 1,
});

const ActionBar = styled(Box, {
  shouldForwardProp: (prop) => prop !== "mine",
})<{ mine?: boolean }>(({ mine }) => ({
  position: "absolute",
  top: -16,
  right: mine ? 8 : "auto",
  left: mine ? "auto" : 8,

  display: "flex",
  alignItems: "center",
  gap: 2,

  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 999,
  padding: "2px 4px",

  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",

  opacity: 0,
  visibility: "hidden",
  transform: "translateY(4px)",
  transition: "all 0.18s ease",

  zIndex: 20,
}));

const ActionBtn = styled(IconButton)({
  width: 28,
  height: 28,
  color: "#64748B",

  "&:hover": {
    background: "#F1F5F9",
    color: "#0068FF",
  },
});

const ReactionWrap = styled(Box)({
  position: "absolute",
  bottom: -10,
  right: 6,

  display: "flex",
  alignItems: "center",
  gap: 1,

  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 999,
  padding: "1px 4px",

  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  cursor: "pointer",
  zIndex: 5,

  "&:hover": {
    boxShadow: "0 2px 6px rgba(0,0,0,0.13)",
  },
});

const ReactionEmoji = styled(Box)({
  fontSize: 15,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
});

const ReactionCount = styled(Typography)({
  fontSize: 11,
  fontWeight: 500,
  color: "#4B5563",
  marginLeft: 0.5,
  lineHeight: 1,
});

const StyledTab = styled(Tab)({
  minHeight: 36,
  minWidth: 50,
  fontSize: 13,
  textTransform: "none",
  fontWeight: 500,
  padding: "4px 10px",
});

const ReplyPreviewBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "mine",
})<{ mine?: boolean }>(({ mine }) => ({
  background: mine ? "rgba(0, 0, 0, 0.05)" : "rgba(0, 0, 0, 0.04)",
  borderRadius: "6px",
  padding: "6px 12px",
  marginBottom: 6,
  borderLeft: "3.5px solid #0068FF",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "all 0.2s ease",
  minWidth: 140,
  maxWidth: "100%",
  userSelect: "none",

  "&:hover": {
    background: mine ? "rgba(0, 0, 0, 0.09)" : "rgba(0, 0, 0, 0.07)",
  },
}));

const ReplySenderName = styled(Box)({
  fontSize: 12,
  fontWeight: 600,
  color: "#0068FF",
  marginBottom: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const ReplyContent = styled(Box)({
  fontSize: 12,
  color: "#4B5563",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
});

const extractAudioDuration = (att: any): number => {
  if (att?.duration && Number.isFinite(Number(att.duration)) && Number(att.duration) > 0) {
    return Number(att.duration);
  }
  const name = att?.name || att?.fileName || att?.key || att?.url || "";
  const match = name.match(/_d(\d+)\./);
  if (match) {
    const sec = parseInt(match[1], 10);
    if (!isNaN(sec) && sec > 0) return sec;
  }
  return 0;
};

const VoicePlayer: React.FC<{ url: string; isOwn?: boolean; initialDuration?: number }> = ({
  url,
  isOwn,
  initialDuration = 0,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration > 0 ? initialDuration : 0);
  const isSeekingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync initialDuration if changed
  useEffect(() => {
    if (initialDuration > 0 && duration === 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration]);

  // Use Web Audio API as reliable duration decoder for WebM without duration headers
  useEffect(() => {
    if (!url) return;
    let isCancelled = false;

    const decodeDuration = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        if (isCancelled) return;

        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (!isCancelled && decoded && Number.isFinite(decoded.duration) && decoded.duration > 0) {
          setDuration(decoded.duration);
        }
        ctx.close().catch(() => {});
      } catch {
        // Ignore and fallback to HTMLAudioElement loadedmetadata
      }
    };

    decodeDuration();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (currentTime >= (duration || 0) && duration > 0) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      audioRef.current.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeekingRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (
        (!duration || !Number.isFinite(duration) || duration === 0) &&
        Number.isFinite(audioRef.current.duration) &&
        audioRef.current.duration > 0
      ) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    } else {
      // Chromium WebM Infinity duration workaround
      const onSeek = () => {
        audio.removeEventListener("timeupdate", onSeek);
        if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
          setDuration(audio.currentTime);
        }
        audio.currentTime = 0;
      };
      audio.addEventListener("timeupdate", onSeek);
      audio.currentTime = 1e7;
    }
  };

  const formatSec = (s: number) => {
    if (!s || isNaN(s) || !Number.isFinite(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        minWidth: 230,
        maxWidth: 320,
        py: 1,
        px: 1.5,
        borderRadius: 3,
        bgcolor: isOwn ? "#F0F7FF" : "#F8FAFC",
        border: "1px solid",
        borderColor: isOwn ? "#D0E2FF" : "#E2E8F0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <IconButton
        onClick={togglePlay}
        sx={{
          bgcolor: "#0068FF",
          color: "#FFFFFF",
          "&:hover": {
            bgcolor: "#0052CC",
          },
          width: 36,
          height: 36,
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0, 104, 255, 0.25)",
        }}
      >
        {isPlaying ? (
          <PauseRoundedIcon sx={{ fontSize: 22 }} />
        ) : (
          <PlayArrowRoundedIcon sx={{ fontSize: 22, ml: 0.2 }} />
        )}
      </IconButton>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, justifyContent: "center" }}>
        <Slider
          size="small"
          value={Math.min(currentTime, duration > 0 ? duration : 0)}
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.05}
          onChange={(_, val) => {
            isSeekingRef.current = true;
            setCurrentTime(val as number);
          }}
          onChangeCommitted={(_, val) => {
            isSeekingRef.current = false;
            const newTime = val as number;
            if (audioRef.current) {
              audioRef.current.currentTime = newTime;
            }
            setCurrentTime(newTime);
          }}
          sx={{
            color: "#0068FF",
            height: 4,
            padding: "8px 0 !important",
            "& .MuiSlider-thumb": {
              width: 12,
              height: 12,
              backgroundColor: "#0068FF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              transition: "transform 0.1s ease",
              "&:hover, &.Mui-focusVisible": {
                boxShadow: "0 0 0 6px rgba(0, 104, 255, 0.16)",
                transform: "scale(1.2)",
              },
              "&.Mui-active": {
                transform: "scale(1.3)",
              },
            },
            "& .MuiSlider-track": {
              height: 4,
              borderRadius: 2,
              border: "none",
              backgroundColor: "#0068FF",
            },
            "& .MuiSlider-rail": {
              height: 4,
              borderRadius: 2,
              opacity: 0.25,
              backgroundColor: "#64748B",
            },
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: -0.2 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0068FF",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {formatSec(currentTime)}
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: "#64748B",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {formatSec(duration)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const renderMessageTextWithMentions = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(@[^\s@]+(?:\s+[^\s@]+)?)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@") && part.length > 1) {
      const isAll = part.trim().toLowerCase() === "@all";
      return (
        <Box
          component="span"
          key={index}
          sx={{
            color: isAll ? "#D97706" : "#005AE0",
            fontWeight: 600,
            bgcolor: isAll ? "rgba(217, 119, 6, 0.1)" : "rgba(0, 90, 224, 0.08)",
            px: 0.5,
            py: 0.1,
            borderRadius: 1,
            display: "inline",
          }}
        >
          {part}
        </Box>
      );
    }
    return part;
  });
};

const MessageItem: React.FC<MessageItemProps> = ({
  content,
  sender,
  timestamp,
  isOwn = false,
  isDeleted = false,
  isPinned = false,
  deliveryStatus = "sent",
  isEdited = false,
  isGrouped = false,
  replyTo,
  attachments = [],
  reactions = [],
  onReply,
  onForward,
  onPin,
  onUnpin,
  onDelete,
  onDeleteForMe,
  onEdit,
  onReact,
  onImageClick,
}) => {
  const { t } = useTranslation();

  const [anchorEl, setAnchorEl] =
    useState<null | HTMLElement>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] =
    useState<null | HTMLElement>(null);

  const currentUserId = useChatStore((s) => s.currentUserId);
  const conversationDetailById = useChatStore((s) => s.conversationDetailById);
  const listConversation = useChatStore((s) => s.listConversation);
  const activeConversationId = useChatStore((s) => s.activeConversationId);

  const convDetail = activeConversationId ? conversationDetailById[activeConversationId] : null;
  const convFromList = activeConversationId ? listConversation.find((c) => c.id === activeConversationId) : null;
  const members = convDetail?.members || convFromList?.members || [];
  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    (members as ConversationMemberDto[]).forEach((m) => {
      const name = m.displayName || m.fullName || m.username || m.nickname || "";
      if (name) map.set(m.userId, name);
    });
    return map;
  }, [members]);

  const resolveUserName = (uid: string): string => {
    if (!uid) return "Người dùng";
    if (uid === currentUserId) return "Bạn";
    return memberMap.get(uid) || uid.slice(0, 8);
  };

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(content);
  const [reactionDetailOpen, setReactionDetailOpen] = useState(false);
  const [reactionTab, setReactionTab] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();

    if (trimmed && trimmed !== content) {
      onEdit?.(trimmed);
    }

    setEditing(false);
  };

  const handleDeliveryIcon = () => {
    switch (deliveryStatus) {
      case "sending":
        return (
          <ScheduleRoundedIcon
            sx={{
              fontSize: 14,
              color: "#94A3B8",
            }}
          />
        );

      case "sent":
        return (
          <CheckRoundedIcon
            sx={{
              fontSize: 14,
              color: "#94A3B8",
            }}
          />
        );

      case "delivered":
        return (
          <DoneAllRoundedIcon
            sx={{
              fontSize: 14,
              color: "#94A3B8",
            }}
          />
        );

      case "read":
        return (
          <DoneAllRoundedIcon
            sx={{
              fontSize: 14,
              color: "#0068FF",
            }}
          />
        );

      default:
        return null;
    }
  };

  const handleScrollToMessage = () => {
    if (!replyTo?.messageId) return;
    const element = document.getElementById(`msg-${replyTo.messageId}`);
    if (element) {
      const bubble = element.querySelector(".message-bubble");
      if (bubble) {
        bubble.scrollIntoView({ behavior: "smooth", block: "center" });
        bubble.classList.add("flash-active");
        setTimeout(() => {
          bubble.classList.remove("flash-active");
        }, 1500);
      } else {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const audioAttachments = attachments.filter((a) => {
    const type = a.type?.toLowerCase();
    const contentType = (a.contentType || a.content_type || '').toLowerCase();
    return type === 'audio' || contentType.startsWith('audio/') || /\.(webm|mp3|wav|ogg|m4a)$/i.test(a.url || a.name || '');
  });

  const contactAttachments = attachments.filter((a) => {
    const type = a.type?.toLowerCase();
    const contentType = (a.contentType || a.content_type || '').toLowerCase();
    return type === 'contact' || contentType === 'application/contact';
  });

  const locationAttachments = attachments.filter((a) => {
    return a.type?.toLowerCase() === 'location' || (a as any).content_type === 'location';
  });

  const reminderAttachments = attachments.filter((a) => {
    return a.type?.toLowerCase() === 'reminder' || (a as any).content_type === 'reminder';
  });

  const noteAttachments = attachments.filter((a) => {
    return a.type?.toLowerCase() === 'note' || (a as any).content_type === 'note';
  });

  const todoAttachments = attachments.filter((a) => {
    return a.type?.toLowerCase() === 'todo' || (a as any).content_type === 'todo';
  });

  const mediaAttachments = attachments.filter((a) => {
    const type = a.type?.toLowerCase();
    const contentType = (a.contentType || a.content_type || '').toLowerCase();
    const isMedia = (type === 'image' || type === 'video' || contentType.startsWith('image/') || contentType.startsWith('video/')) && !audioAttachments.includes(a);
    return isMedia;
  });

  const fileAttachments = attachments.filter((a) => {
    const type = a.type?.toLowerCase();
    const contentType = (a.contentType || a.content_type || '').toLowerCase();
    const isFile = type === 'document' || type === 'file' ||
      (!contentType.startsWith('image/') && !contentType.startsWith('video/') && !contentType.startsWith('audio/'));
    return isFile && !mediaAttachments.includes(a) && !audioAttachments.includes(a) && !contactAttachments.includes(a) && !locationAttachments.includes(a) && !reminderAttachments.includes(a) && !noteAttachments.includes(a) && !todoAttachments.includes(a);
  });

  const linkUrls = content.match(/(https?:\/\/[^\s]+)/g) || [];

  return (
    <MessageRow mine={isOwn} isGrouped={isGrouped}>
      {!isOwn && !isGrouped ? (
        <MessageAvatar src={sender?.avatar}>
          {sender?.name?.charAt(0).toUpperCase()}
        </MessageAvatar>
      ) : (
        !isOwn && <Box width={32} />
      )}

      <BubbleWrap mine={isOwn}>
        <Fade in={!editing}>
          <ActionBar
            mine={isOwn}
            className="message-actions"
          >
            {onReply && (
              <Tooltip title={t("CHAT.ACTION_REPLY")}>
                <ActionBtn
                  size="small"
                  onClick={onReply}
                >
                  <ReplyOutlinedIcon
                    sx={{ fontSize: 17 }}
                  />
                </ActionBtn>
              </Tooltip>
            )}

            {onReact && (
              <Tooltip title={t("CHAT.ADD_REACTION")}>
                <ActionBtn
                  size="small"
                  onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
                >
                  <EmojiEmotionsOutlinedIcon
                    sx={{ fontSize: 17 }}
                  />
                </ActionBtn>
              </Tooltip>
            )}
            <Popper
              open={Boolean(emojiAnchorEl)}
              anchorEl={emojiAnchorEl}
              placement="top"
              disablePortal
              sx={{ zIndex: 1300 }}
            >
              <ClickAwayListener onClickAway={() => setEmojiAnchorEl(null)}>
                <EmojiPickerBox elevation={4}>
                  {REACTION_EMOJIS.map((emoji) => (
                    <Tooltip key={emoji} title={emoji}>
                      <EmojiBtn
                        size="small"
                        onClick={() => {
                          onReact?.(emoji);
                          setEmojiAnchorEl(null);
                        }}
                      >
                        {emoji}
                      </EmojiBtn>
                    </Tooltip>
                  ))}
                </EmojiPickerBox>
              </ClickAwayListener>
            </Popper>

            <Tooltip title={t("CHAT.MORE_OPTIONS")}>
              <ActionBtn
                size="small"
                onClick={(e) =>
                  setAnchorEl(e.currentTarget)
                }
              >
                <MoreHorizOutlinedIcon
                  sx={{ fontSize: 18 }}
                />
              </ActionBtn>
            </Tooltip>
          </ActionBar>
        </Fade>

        <Bubble
          mine={isOwn}
          isDeleted={isDeleted}
          className="message-bubble"
        >
          {!isOwn && !isGrouped && sender && (
            <SenderName>
              {sender.name}
            </SenderName>
          )}

          {editing ? (
            <TextField
              fullWidth
              multiline
              maxRows={4}
              inputRef={inputRef}
              value={editText}
              onChange={(e) =>
                setEditText(e.target.value)
              }
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  handleSaveEdit();
                }

                if (e.key === "Escape") {
                  setEditing(false);
                  setEditText(content);
                }
              }}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: 14,
                  borderRadius: 2,
                  background: "#fff",
                },
              }}
            />
          ) : (
            <>
              {replyTo && (() => {
                const {
                  text: replyText,
                  imageAttachment,
                  videoAttachment,
                  imageCount,
                  fileAttachments,
                  fileCount,
                } = getReplyPreview(replyTo as any);
                return (
                  <ReplyPreviewBox mine={isOwn} onClick={handleScrollToMessage}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <ReplySenderName>
                        {replyTo.senderName || t("CHAT.USER")}
                      </ReplySenderName>
                      <ReplyContent>
                        {replyTo.isDeleted
                          ? t("CHAT.MESSAGE_DELETED")
                          : replyText || (imageAttachment
                              ? imageCount > 1
                                ? t("CHAT.IMAGES_COUNT", { count: imageCount })
                                : t("CHAT.IMAGE")
                              : videoAttachment
                              ? t("CHAT.VIDEO")
                              : fileCount > 1
                              ? t("CHAT.FILES_COUNT", { count: fileCount })
                              : fileCount === 1
                              ? t("CHAT.FILE_ATTACHMENT")
                              : t("CHAT.MESSAGE")
                            )
                        }
                      </ReplyContent>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, ml: 1.5 }}>
                      {!replyTo.isDeleted && imageAttachment && (
                        <Box sx={{ position: "relative" }}>
                          <Box
                            component="img"
                            src={imageAttachment.thumbnailUrl || imageAttachment.url || imageAttachment.key}
                            alt="replied-media"
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          {imageCount > 1 && (
                            <Box sx={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              bgcolor: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              fontSize: 9,
                              px: 0.4,
                              borderRadius: "0 1px 0 1px",
                              lineHeight: "14px",
                            }}>
                              +{imageCount - 1}
                            </Box>
                          )}
                        </Box>
                      )}
                      {!replyTo.isDeleted && !imageAttachment && videoAttachment && (
                        <Box
                          component="img"
                          src={videoAttachment.thumbnailUrl || videoAttachment.url || videoAttachment.key}
                          alt="replied-video"
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1,
                            objectFit: "cover",
                            display: "block",
                            backgroundColor: "#000",
                          }}
                        />
                      )}
                      {!replyTo.isDeleted && !imageAttachment && !videoAttachment && fileAttachments.length > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: "#64748B" }} />
                          <ReplyContent>
                            {fileCount === 1 ? fileAttachments[0].name : `${fileCount} files`}
                          </ReplyContent>
                        </Box>
                      )}
                    </Box>
                  </ReplyPreviewBox>
                );
              })()}

              {!!content && (
                <MessageText>
                  {renderMessageTextWithMentions(content)}
                </MessageText>
              )}

              {audioAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: content ? 1 : 0 }}>
                  {audioAttachments.map((att, idx) => (
                    <VoicePlayer
                      key={att.key || idx}
                      url={att.url || buildS3Url(att.key)}
                      isOwn={isOwn}
                      initialDuration={extractAudioDuration(att)}
                    />
                  ))}
                </Box>
              )}

              {mediaAttachments.length > 0 && (
                <ImageList
                  cols={
                    mediaAttachments.length >= 3
                      ? 3
                      : mediaAttachments.length
                  }
                  gap={4}
                  sx={{
                    mt: content ? 1 : 0,
                    overflow: "hidden",
                    borderRadius: 2,
                    mb:
                      reactions.length > 0
                        ? 1.5
                        : 0,
                  }}
                >
                  {mediaAttachments
                    .slice(0, 9)
                    .map((att, index) => (
                      <ImageListItem
                        key={att.key || index}
                        sx={{
                          overflow: "hidden",
                          borderRadius: 2,
                          cursor: "pointer",
                          position: "relative",

                          "& img, & video": {
                            transition:
                              "0.2s ease",
                          },

                          "&:hover img, &:hover video": {
                            transform:
                              "scale(1.03)",
                          },
                        }}
                        onClick={() =>
                          onImageClick?.(
                            att.url ||
                              att.thumbnailUrl ||
                              "",
                            mediaAttachments,
                            index
                          )
                        }
                      >
                        {(() => {
                          const isVideo = att.type?.toLowerCase() === 'video' || (att.contentType || att.content_type || '').toLowerCase().startsWith('video/');
                          if (isVideo) {
                            return (
                              <Box
                                sx={{
                                  position: "relative",
                                  width: "100%",
                                  height: 150,
                                }}
                              >
                                <Box
                                  component="video"
                                  src={att.url || att.thumbnailUrl}
                                  sx={{
                                    width: "100%",
                                    height: 150,
                                    objectFit: "cover",
                                    display: "block",
                                    background: "#000",
                                  }}
                                />
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    background: "rgba(0,0,0,0.6)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    pointerEvents: "none",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 0,
                                      height: 0,
                                      borderStyle: "solid",
                                      borderWidth: "8px 0 8px 14px",
                                      borderColor: "transparent transparent transparent #fff",
                                      ml: 1,
                                    }}
                                  />
                                </Box>
                              </Box>
                            );
                          }
                          return (
                            <Box
                              component="img"
                              src={
                                att.thumbnailUrl ||
                                att.url
                              }
                              alt={att.name}
                              sx={{
                                width: "100%",
                                height: 150,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          );
                        })()}
                      </ImageListItem>
                    ))}
                </ImageList>
              )}

              {fileAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: content || mediaAttachments.length > 0 ? 1 : 0 }}>
                  {fileAttachments.map((att, index) => (
                    <FileAttachmentCard
                      key={att.key || index}
                      attachment={{
                        name: att.name || "file",
                        size: att.size || 0,
                        type: att.type || "document",
                        url: att.url,
                        key: att.key,
                        contentType: att.contentType,
                      }}
                      isOwn={isOwn}
                      onPreview={() => {
                        const fileUrl = att.url || buildS3Url(att.key);
                        const contentType = (att.contentType || att.content_type || "").toLowerCase();
                        const isVideo = att.type?.toLowerCase() === 'video' || contentType.startsWith('video/');
                        const isImage = att.type?.toLowerCase() === 'image' || contentType.startsWith('image/');
                        
                        onImageClick?.(fileUrl || "", [{
                          key: att.key || fileUrl || "",
                          name: att.name || "file",
                          type: isVideo ? "video" : isImage ? "image" : "document"
                        }], 0);
                      }}
                    />
                  ))}
                </Box>
              )}

              {contactAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: content || mediaAttachments.length > 0 || fileAttachments.length > 0 ? 1 : 0 }}>
                  {contactAttachments.map((att, index) => (
                    <Box
                      key={att.key || index}
                      sx={{
                        p: 1.5,
                        bgcolor: "#FFFFFF",
                        borderRadius: 2,
                        border: "1px solid #D0E2FF",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.2,
                        minWidth: 220,
                        maxWidth: 280,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar src={resolveMediaUrl(att.url) || undefined} sx={{ width: 44, height: 44, bgcolor: "#005AE0" }}>
                          {(att.name || "?")[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ overflow: "hidden", flex: 1 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#111827", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {att.name}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                            {att.size ? `SĐT: ${att.size}` : "Danh thiếp Zalo"}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{
                          textTransform: "none",
                          fontSize: 13,
                          borderRadius: 1.5,
                          borderColor: "#005AE0",
                          color: "#005AE0",
                          "&:hover": { bgcolor: "#F0F7FF", borderColor: "#005AE0" },
                        }}
                        onClick={async () => {
                          const targetUserId = att.key;
                          if (targetUserId) {
                            try {
                              const res: any = await chatService.createDirectConversation({ participantId: targetUserId });
                              const newId = res?.payload?.data?.id || res?.data?.data?.id || res?.data?.id;
                              if (newId) {
                                useChatStore.getState().setActiveConversationId(newId);
                              }
                            } catch (e) {
                              console.error("Open direct chat error:", e);
                            }
                          }
                        }}
                      >
                        Nhắn tin
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}

              {linkUrls.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: content || mediaAttachments.length > 0 || fileAttachments.length > 0 ? 1 : 0 }}>
                  {linkUrls.map((url, index) => (
                    <LinkPreviewCard key={index} url={url} isOwn={isOwn} />
                  ))}
                </Box>
              )}

              {locationAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                  {locationAttachments.map((att, index) => {
                    const meta = (att as any).metadata || {};
                    const lat = meta.lat ?? att.name?.split(",")[0];
                    const lng = meta.lng ?? att.name?.split(",")[1];
                    const address = meta.address || att.name || "Vị trí";
                    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng)-0.005},${Number(lat)-0.005},${Number(lng)+0.005},${Number(lat)+0.005}&layer=mapnik&marker=${lat},${lng}`;
                    return (
                      <Box
                        key={att.key || index}
                        sx={{
                          borderRadius: 2,
                          overflow: "hidden",
                          border: "1px solid #E5E7EB",
                          maxWidth: 280,
                          bgcolor: "#fff",
                        }}
                      >
                        <Box
                          component="iframe"
                          src={osmEmbedUrl}
                          sx={{ width: "100%", height: 150, border: "none", display: "block" }}
                          title="Bản đồ vị trí"
                        />
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            📍 {address}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ fontSize: 11, textTransform: "none" }}
                            >
                              Google Maps
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {reminderAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                  {reminderAttachments.map((att, index) => {
                    const meta = (att as any).metadata || {};
                    return (
                      <Box
                        key={att.key || index}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid #FCD34D",
                          bgcolor: "#FFFBEB",
                          maxWidth: 300,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.8,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AlarmIcon sx={{ color: "#D97706", fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#92400E" }}>
                            {meta.title || att.name}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: "#78350F" }}>
                          📅 Thời gian: <strong>{meta.dateTime || "Sắp diễn ra"}</strong>
                        </Typography>
                        {meta.repeatLabel && meta.repeatLabel !== "Không lặp" && (
                          <Chip
                            label={`🔄 ${meta.repeatLabel}`}
                            size="small"
                            sx={{ alignSelf: "flex-start", fontSize: 11, bgcolor: "#FEF3C7", color: "#B45309" }}
                          />
                        )}
                        {meta.note && (
                          <Typography sx={{ fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>
                            {meta.note}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}

              {noteAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                  {noteAttachments.map((att, index) => {
                    const meta = (att as any).metadata || {};
                    return (
                      <Box
                        key={att.key || index}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid #BFDBFE",
                          bgcolor: "#EFF6FF",
                          maxWidth: 320,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.8,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <DescriptionIcon sx={{ color: "#2563EB", fontSize: 20 }} />
                            <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#1E40AF" }}>
                              {meta.title || att.name}
                            </Typography>
                          </Box>
                          {meta.pinToTop && (
                            <Chip label="Đã ghim" size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 13, color: "#1F2937", whiteSpace: "pre-wrap" }}>
                          {meta.content || ""}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {todoAttachments.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                  {todoAttachments.map((att, index) => {
                    const meta = (att as any).metadata || {};
                    return (
                      <Box
                        key={att.key || index}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid #E0E7FF",
                          bgcolor: "#F5F3FF",
                          maxWidth: 300,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AssignmentTurnedInIcon sx={{ color: "#7C3AED", fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#5B21B6" }}>
                            {meta.title || att.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontSize: 12, color: "#4B5563" }}>Giao cho:</Typography>
                          <Avatar
                            src={resolveMediaUrl(meta.assigneeAvatar) || undefined}
                            sx={{ width: 20, height: 20, fontSize: 10 }}
                          >
                            {(meta.assigneeName || "?")[0]?.toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                            {meta.assigneeName || "Thành viên"}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: "#DC2626" }}>
                          ⏳ Hạn chót: <strong>{meta.dueDate || "Không có hạn"}</strong>
                        </Typography>
                        {meta.description && (
                          <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                            {meta.description}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}

          {reactions.length > 0 && (
            <ReactionWrap onClick={() => setReactionDetailOpen(true)}>
              {reactions.slice(0, 3).map((r, i) => (
                <Tooltip
                  key={i}
                  title={
                    <Box sx={{ fontSize: 12 }}>
                      {r.userIds.slice(0, 5).map((uid, j) => (
                        <div key={j}>{resolveUserName(uid)}</div>
                      ))}
                      {r.userIds.length > 5 && <div>+{r.userIds.length - 5} khác</div>}
                    </Box>
                  }
                  placement="top"
                  componentsProps={{ tooltip: { sx: { bgcolor: "#1F2937", fontSize: 12 } } }}
                >
                  <ReactionEmoji>
                    {r.emoji}
                    {r.count > 1 && <ReactionCount>{r.count}</ReactionCount>}
                  </ReactionEmoji>
                </Tooltip>
              ))}
            </ReactionWrap>
          )}
        </Bubble>

        <MetaRow
          sx={{
            justifyContent: isOwn
              ? "flex-end"
              : "flex-start",
            px: 0.5,
          }}
        >
          <MetaText>{timestamp}</MetaText>

          {isEdited && (
            <MetaText>
              • {t("CHAT.MESSAGE_EDITED")}
            </MetaText>
          )}

          {isPinned && (
            <PushPinOutlinedIcon
              sx={{
                fontSize: 12,
                color: "#94A3B8",
              }}
            />
          )}

          {isOwn && handleDeliveryIcon()}
        </MetaRow>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            elevation: 3,
            sx: {
              minWidth: 180,
              borderRadius: 3,
              mt: 1,
              border: "1px solid #E5E7EB",
            },
          }}
        >
          {[
            onForward ? (
              <MenuItem
                key="forward"
                onClick={() => {
                  setAnchorEl(null);
                  onForward();
                }}
              >
                <ForwardOutlinedIcon
                  sx={{ mr: 1.2, fontSize: 18 }}
                />
                {t("CHAT.ACTION_FORWARD")}
              </MenuItem>
            ) : null,
            onPin && !isPinned ? (
              <MenuItem
                key="pin"
                onClick={() => {
                  setAnchorEl(null);
                  onPin?.();
                }}
              >
                <PushPinOutlinedIcon sx={{ mr: 1.2, fontSize: 18 }} />
                {t("CHAT.ACTION_PIN")}
              </MenuItem>
            ) : null,
            onUnpin && isPinned ? (
              <MenuItem
                key="unpin"
                onClick={() => {
                  setAnchorEl(null);
                  onUnpin?.();
                }}
              >
                <PushPinOutlinedIcon sx={{ mr: 1.2, fontSize: 18 }} />
                {t("CHAT.ACTION_UNPIN")}
              </MenuItem>
            ) : null,
            onEdit && isOwn ? (
              <MenuItem
                key="edit"
                onClick={() => {
                  setAnchorEl(null);
                  setEditing(true);
                }}
              >
                <EditOutlinedIcon
                  sx={{ mr: 1.2, fontSize: 18 }}
                />
                {t("CHAT.ACTION_EDIT")}
              </MenuItem>
            ) : null,
            onDelete && isOwn ? (
              <MenuItem
                key="recall"
                sx={{
                  color: "#EF4444",
                }}
                onClick={() => {
                  setAnchorEl(null);
                  onDelete();
                }}
              >
                <DeleteOutlineOutlinedIcon
                  sx={{ mr: 1.2, fontSize: 18 }}
                />
                Thu hồi
              </MenuItem>
            ) : null,
            onDeleteForMe ? (
              <MenuItem
                key="deleteForMe"
                sx={{
                  color: "#6B7280",
                }}
                onClick={() => {
                  setAnchorEl(null);
                  onDeleteForMe();
                }}
              >
                <DeleteOutlineOutlinedIcon
                  sx={{ mr: 1.2, fontSize: 18 }}
                />
                Xóa chỉ ở phía tôi
              </MenuItem>
            ) : null,
          ]}
        </Menu>

        <Dialog
          open={reactionDetailOpen}
          onClose={() => setReactionDetailOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, maxHeight: 400 } }}
        >
          <DialogTitle sx={{ fontSize: 16, fontWeight: 600, pb: 0 }}>
            {"Phản ứng"}
          </DialogTitle>
          <DialogContent sx={{ px: 2, py: 1.5 }}>
            <Tabs
              value={reactionTab}
              onChange={(_, v) => setReactionTab(v)}
              variant="scrollable"
              scrollButtons={false}
              sx={{ minHeight: 36, mb: 1, "& .MuiTabs-indicator": { height: 2.5 } }}
            >
              <StyledTab label={`Tất cả (${reactions.reduce((s, r) => s + r.count, 0)})`} />
              {reactions.map((r, i) => (
                <StyledTab key={i} label={`${r.emoji} ${r.count}`} />
              ))}
            </Tabs>
            <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
              {(reactionTab === 0 ? reactions : [reactions[reactionTab - 1]]).map((r, i) =>
                r.userIds.map((uid) => {
                  const name = resolveUserName(uid);
                  return (
                    <Box key={`${uid}-${r.emoji}`} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.6 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "#E5E7EB", color: "#4B5563" }}>
                        {name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontSize: 14, flex: 1 }}>{name}</Typography>
                      <Typography sx={{ fontSize: 16 }}>{r.emoji}</Typography>
                    </Box>
                  );
                })
              )}
            </Box>
          </DialogContent>
        </Dialog>
      </BubbleWrap>
    </MessageRow>
  );
};

export default MessageItem;