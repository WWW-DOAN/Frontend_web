"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  IconButton,
  CircularProgress,
  Tooltip,
  useMediaQuery,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Chip,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { chatbotService } from "@/src/common/service/chatbot-service";
import { sendTyping, sendStopTyping } from "@/src/common/action/chat.action";
import { styled, keyframes } from "@mui/material/styles";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import PollOutlinedIcon from "@mui/icons-material/PollOutlined";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AlarmOutlinedIcon from "@mui/icons-material/AlarmOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import dynamic from "next/dynamic";
import InsertEmoticonRoundedIcon from "@mui/icons-material/InsertEmoticonRounded";
import { EmojiClickData } from "emoji-picker-react";
import ComposerActionPreview from "./ComposerActionPreview";
import PendingAttachmentsList from "./PendingAttachmentsList";
import { ChatAttachmentPayload } from "@/src/common/interface/media-interface";
import { uploadMedia } from "@/src/common/service/media-service";
import { useChatStore } from "@/src/common/store/useChatStore";
import { useAuthStore } from "@/src/common/store/useAuthStore";
import { useTrans } from "@/src/common/utilities/hook/trans";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

const pulseRed = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
`;

interface ChatInputProps {
  disabled?: boolean;
  conversationId?: string;
  onSend: (value: string, attachments: ChatAttachmentPayload[]) => void;
  replyMessage?: {
    messageId: string;
    body: string;
    senderName?: string;
  } | null;
  onCancelReply?: () => void;
  isGroup?: boolean;
  onOpenCreatePoll?: () => void;
  onOpenShareContact?: () => void;
  onOpenCreateReminder?: () => void;
  onOpenCreateNote?: () => void;
  onOpenCreateTodo?: () => void;
}

const ChatInputContainer = styled(Box)({
  background: "#fff",
  borderTop: "1px solid #E5E7EB",
  padding: "8px 12px 12px",
  position: "relative",
  "@media (max-width: 767px)": {
    padding: "6px 8px 8px",
  },
});

const InputWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  background: "#F0F2F5",
  borderRadius: 20,
  border: "1px solid #E5E7EB",
  padding: "3px 6px",
  gap: 4,
  boxSizing: "border-box",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  "&:focus-within": {
    borderColor: "#005AE0",
    boxShadow: "0 0 0 2px rgba(0, 90, 224, 0.1)",
    background: "#FFFFFF",
  },
  "@media (max-width: 767px)": {
    padding: "2px 4px",
    gap: 2,
  },
});

const InputField = styled("textarea")({
  flex: 1,
  boxSizing: "border-box",
  height: 36,
  minHeight: 36,
  maxHeight: 120,
  border: "none",
  background: "transparent",
  padding: "8px 8px",
  fontSize: 14,
  color: "#0F172A",
  outline: "none",
  resize: "none",
  fontFamily: "inherit",
  lineHeight: "20px",
  overflowY: "auto",
  scrollbarWidth: "none",
  display: "block",
  margin: 0,
  "&::-webkit-scrollbar": { display: "none" },
  "&::placeholder": {
    color: "#94A3B8",
    opacity: 1,
    lineHeight: "20px",
  },
});

const IconBtn = styled(IconButton)({
  width: 36,
  height: 36,
  minWidth: 36,
  color: "#64748B",
  borderRadius: 10,
  flexShrink: 0,
  padding: "6px",
  "&:hover": {
    background: "rgba(0, 0, 0, 0.06)",
    color: "#005AE0",
  },
  "@media (max-width: 767px)": {
    width: 36,
    height: 36,
    minWidth: 36,
  },
});

const SendBtn = styled(IconButton)({
  width: 36,
  height: 36,
  minWidth: 36,
  borderRadius: 10,
  backgroundColor: "#0068FF",
  color: "#FFFFFF",
  flexShrink: 0,
  padding: "6px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: "#005AE0",
  },
  "&:disabled": {
    backgroundColor: "#E5E7EB",
    color: "#94A3B8",
  },
  "@media (max-width: 767px)": {
    width: 36,
    height: 36,
    minWidth: 36,
  },
});

const EmojiWrap = styled(Box)({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const PickerBox = styled(Box)({
  position: "absolute",
  bottom: 44,
  right: 0,
  zIndex: 20,
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  borderRadius: 12,
  overflow: "hidden",
  "@media (max-width: 767px)": {
    right: -50,
  },
});

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragging",
})<{ isDragging?: boolean }>(({ isDragging }) => ({
  borderRadius: 16,
  border: isDragging ? "2px dashed #005AE0" : "2px dashed transparent",
  background: isDragging ? "rgba(0, 90, 224, 0.05)" : "transparent",
  transition: "all 0.2s ease",
  padding: isDragging ? "8px" : 0,
}));

// Voice recording bar
const VoiceRecordingBar = styled(Box)({
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "4px 8px",
  gap: 12,
  background: "#FEE2E2",
  borderRadius: 14,
  border: "1px solid #FCA5A5",
});

export default function ChatInput({
  disabled,
  conversationId,
  onSend,
  replyMessage,
  onCancelReply,
  isGroup: isGroupProp,
  onOpenCreatePoll,
  onOpenShareContact,
  onOpenCreateReminder,
  onOpenCreateNote,
  onOpenCreateTodo,
}: ChatInputProps) {
  const isMobile = useMediaQuery("(max-width:767px)");
  const currentUserId = useChatStore((state) => state.currentUserId);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversationDetailById = useChatStore((state) => state.conversationDetailById);
  const listConversation = useChatStore((state) => state.listConversation);
  const t = useTrans();

  const conv = conversationId
    ? conversationDetailById[conversationId] || listConversation.find((c) => c.id === conversationId)
    : activeConversationId
    ? conversationDetailById[activeConversationId] || listConversation.find((c) => c.id === activeConversationId)
    : null;

  const isGroupConv = isGroupProp ?? (conv?.type === "group" || conv?.type === "GROUP");
  const myMember = conv?.members?.find((m: any) => m.userId === currentUserId);
  const isOwnerOrAdmin = myMember?.role === "OWNER" || myMember?.role === "ADMIN";
  const canSendInGroup = conv?.settings?.permissions?.canSendMessage !== false;
  const isSendBlocked = isGroupConv && !isOwnerOrAdmin && !canSendInGroup;

  const authUser = useAuthStore((s) => s.authData?.data?.user);
  const currentUserName =
    authUser?.displayName ||
    authUser?.fullName ||
    authUser?.username ||
    myMember?.displayName ||
    "Thành viên";

  const [value, setValue] = useState("");
  const [openEmoji, setOpenEmoji] = useState(false);
  const [utilitiesAnchor, setUtilitiesAnchor] = useState<null | HTMLElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentPayload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const effectiveConvId = conversationId || activeConversationId;

  // Restore draft when conversation changes
  useEffect(() => {
    if (!effectiveConvId) return;
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem("chat_draft_" + effectiveConvId) || "";
      setValue(draft);
    }
  }, [effectiveConvId]);

  // Smart Replies state
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingSmartReplies, setLoadingSmartReplies] = useState(false);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const convMessages = effectiveConvId ? messagesByConversation[effectiveConvId] : undefined;

  const lastMessage = useMemo(() => {
    if (!convMessages || convMessages.length === 0) return null;
    return convMessages[convMessages.length - 1];
  }, [convMessages]);

  const lastCheckedMsgIdRef = useRef<string | null>(null);
  const activeReqConvIdRef = useRef<string | null>(effectiveConvId);

  // Clear suggestions and reset state whenever user switches conversation
  useEffect(() => {
    setSmartReplies([]);
    setLoadingSmartReplies(false);
    lastCheckedMsgIdRef.current = null;
    activeReqConvIdRef.current = effectiveConvId;
  }, [effectiveConvId]);

  const requestSmartReplies = useCallback(
    async (force = false) => {
      if (!effectiveConvId) return;
      const targetConvId = effectiveConvId;
      activeReqConvIdRef.current = targetConvId;

      const msgs = messagesByConversation[targetConvId] || [];
      const validMsgs = msgs.filter((m) => !m.isDeleted && Boolean(m.body));
      if (validMsgs.length === 0) {
        if (force && activeReqConvIdRef.current === targetConvId) {
          setSmartReplies(["Chào bạn!", "Bạn cần mình hỗ trợ gì?", "Hôm nay thế nào rồi?"]);
        }
        return;
      }

      setLoadingSmartReplies(true);
      try {
        const recent = validMsgs.slice(-6).map((m) => ({
          senderName: m.senderName || (m.senderId === currentUserId ? "Tôi" : "Đối phương"),
          content: m.body || "",
          isOwn: m.senderId === currentUserId,
        }));

        const res = await chatbotService.smartReplies({ recentMessages: recent });
        if (activeReqConvIdRef.current !== targetConvId) return;

        const rawData = (res as any)?.data ?? (res as any)?.payload;
        const innerData = rawData?.data ?? rawData;
        if (innerData?.suggestions && innerData.suggestions.length > 0) {
          setSmartReplies(innerData.suggestions);
        } else {
          setSmartReplies(["Đồng ý nhé", "Để mình kiểm tra lại", "Ok bạn!"]);
        }
      } catch (err) {
        if (activeReqConvIdRef.current !== targetConvId) return;
        console.warn("[SmartReplies] Request failed, using fallback:", err);
        setSmartReplies(["Đồng ý nhé", "Để mình xem lại chút", "Ok bạn!"]);
      } finally {
        if (activeReqConvIdRef.current === targetConvId) {
          setLoadingSmartReplies(false);
        }
      }
    },
    [effectiveConvId, messagesByConversation, currentUserId]
  );

  useEffect(() => {
    if (!lastMessage || !effectiveConvId) return;

    // Trigger auto suggestion if the latest message was from another user or bot (not current user)
    const isOtherSender = lastMessage.senderId !== currentUserId;
    if (!isOtherSender || !lastMessage.body || lastMessage.isDeleted) {
      setSmartReplies([]);
      return;
    }

    if (lastCheckedMsgIdRef.current === lastMessage.messageId) {
      return;
    }
    lastCheckedMsgIdRef.current = lastMessage.messageId;

    requestSmartReplies(false);
  }, [lastMessage, effectiveConvId, currentUserId, requestSmartReplies]);

  const handleSelectSmartReply = (replyText: string) => {
    setValue(replyText);
    if (effectiveConvId && typeof window !== "undefined") {
      localStorage.setItem("chat_draft_" + effectiveConvId, replyText);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Mention state
  const [mentionFilter, setMentionFilter] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasText = !!value.trim();
  const hasAttachments = pendingAttachments.length > 0;
  const lastTypingTime = useRef<number>(0);

  // Auto-resize textarea height
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      const targetHeight = !value.trim() ? 36 : Math.min(Math.max(el.scrollHeight, 36), 120);
      el.style.height = `${targetHeight}px`;
    }
  }, [value]);

  // Active group members for @mention
  const members = (conv?.members || []).filter((m: any) => m.userId !== currentUserId);

  // @All special entry for OWNER/ADMIN
  const allEntry = { userId: "__all__", displayName: "All", fullName: "All", username: "All", avatarUrl: null };

  // @ZAi special bot entry
  const zaiEntry = {
    userId: "__zai__",
    displayName: "ZAi",
    fullName: "ZAi (Trợ lý AI)",
    username: "ZAi",
    avatarUrl: null,
    isBot: true,
  };

  const isZaiMatch =
    mentionFilter !== null &&
    ("zai".includes(mentionFilter) || "ai".includes(mentionFilter) || mentionFilter === "");

  const filteredMembers = mentionFilter !== null
    ? [
        ...(isZaiMatch ? [zaiEntry] : []),
        ...(isOwnerOrAdmin && "all".includes(mentionFilter) ? [allEntry] : []),
        ...members.filter((m: any) => {
          const name = (m.displayName || m.fullName || m.username || "").toLowerCase();
          return name.includes(mentionFilter);
        }),
      ]
    : [];

  // Listen to quick action trigger to insert @ZAi
  useEffect(() => {
    const handleInsertMention = (e: any) => {
      const textToInsert = e.detail?.text || "@ZAi tóm tắt đoạn chat gần đây";
      setValue((prev) => (prev ? `${prev.trim()} ${textToInsert} ` : `${textToInsert} `));
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      });
    };

    window.addEventListener("chat:insert_mention", handleInsertMention);
    return () => {
      window.removeEventListener("chat:insert_mention", handleInsertMention);
    };
  }, []);

  // Cleanup audio tracks on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files.length || !currentUserId) return;
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          Array.from(files).map(async (file) => {
            console.log("[ChatInput] Uploading file:", file.name, file.type, file.size);
            const result = await uploadMedia({ file, userId: currentUserId });
            console.log("[ChatInput] Upload result:", result);
            return {
              key: result.key,
              url: result.url,
              type: result.type,
              name: result.fileName,
              size: result.size,
              content_type: result.contentType,
              thumbnail_key: result.thumbnailKey || undefined,
              thumbnailUrl: result.thumbnailKey || result.url,
              visibility: result.visibility,
            } as ChatAttachmentPayload;
          })
        );
        setPendingAttachments((prev) => [...prev, ...uploaded]);
      } catch (err) {
        console.error("[ChatInput] Upload media failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [currentUserId]
  );

  // Clipboard Paste support (Ctrl+V screenshot images & files)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData || disabled) return;

      const items = clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    },
    [disabled, handleFiles]
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleRemoveAttachment = useCallback((key: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.key !== key));
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // Location sharing
  const handleShareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationPayload: ChatAttachmentPayload = {
          type: "location",
          url: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`,
          name: `${latitude.toFixed(5)},${longitude.toFixed(5)}`,
          content_type: "location",
          metadata: {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          },
        };
        onSend("Đã chia sẻ vị trí", [locationPayload]);
      },
      () => alert("Không thể lấy vị trí. Vui lòng cho phép truy cập.")
    );
  }, [onSend]);

  // Mention trigger check
  const checkMention = (text: string, cursorPos: number) => {
    if (!isGroupConv) {
      setMentionFilter(null);
      return;
    }
    const textBefore = text.slice(0, cursorPos);
    const match = textBefore.match(/@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]*)$/);
    if (match) {
      setMentionFilter(match[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionFilter(null);
    }
  };

  const selectMention = (member: any) => {
    const input = inputRef.current;
    if (!input) return;
    const cursorPos = input.selectionStart || value.length;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    const match = textBefore.match(/@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]*)$/);
    if (!match) return;

    const mentionName = member.displayName || member.fullName || member.username || "Thành viên";
    const newBefore = textBefore.slice(0, match.index) + `@${mentionName} `;
    const newValue = newBefore + textAfter;
    setValue(newValue);
    setMentionFilter(null);

    requestAnimationFrame(() => {
      input.focus();
      const newPos = newBefore.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setValue(val);
      if (effectiveConvId && typeof window !== "undefined") {
        if (val.trim()) {
          localStorage.setItem("chat_draft_" + effectiveConvId, val);
        } else {
          localStorage.removeItem("chat_draft_" + effectiveConvId);
        }
      }
      checkMention(val, e.target.selectionStart || val.length);

      if (conversationId) {
        if (!val.trim()) {
          sendStopTyping(conversationId, currentUserName);
        } else {
          const now = Date.now();
          if (now - lastTypingTime.current >= 1500) {
            lastTypingTime.current = now;
            sendTyping(conversationId, currentUserName);
          }
        }
      }
    },
    [conversationId, isGroupConv, effectiveConvId, currentUserName]
  );

  useEffect(() => {
    return () => {
      if (effectiveConvId) {
        sendStopTyping(effectiveConvId, currentUserName);
      }
    };
  }, [effectiveConvId, currentUserName]);

  const handleSend = () => {
    const text = value.trim();
    if ((!text && !hasAttachments) || disabled) return;
    onSend(text, pendingAttachments);
    if (conversationId) sendStopTyping(conversationId, currentUserName);
    setValue("");
    if (effectiveConvId && typeof window !== "undefined") {
      localStorage.removeItem("chat_draft_" + effectiveConvId);
    }
    setPendingAttachments([]);
    setOpenEmoji(false);
    setMentionFilter(null);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (mentionFilter !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionFilter(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const el = inputRef.current;
    const emoji = emojiData.emoji;
    if (!el) {
      setValue((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + emoji + value.slice(end);
    setValue(newValue);
    requestAnimationFrame(() => {
      el.focus();
      const nextPos = start + emoji.length;
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("[ChatInput] Microphone access error:", err);
      alert("Không thể truy cập Microphone. Vui lòng cấp quyền micro trong trình duyệt để ghi âm.");
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const sendRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const elapsedSec = Math.max(
      1,
      recordingDuration || Math.round((Date.now() - (recordingStartTimeRef.current || Date.now())) / 1000)
    );

    recorder.onstop = async () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      const chunks = audioChunksRef.current;
      if (!chunks.length || !currentUserId) return;
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const voiceFilename = `voice_${Date.now()}_d${elapsedSec}.webm`;
      const audioFile = new File([audioBlob], voiceFilename, {
        type: "audio/webm",
      });

      setUploading(true);
      try {
        const result = await uploadMedia({ file: audioFile, userId: currentUserId });
        const attachment: ChatAttachmentPayload = {
          key: result.key,
          url: result.url,
          type: "audio",
          name: result.fileName || voiceFilename,
          size: result.size,
          content_type: "audio/webm",
          visibility: result.visibility,
          duration: elapsedSec,
        };
        onSend("", [attachment]);
      } catch (err) {
        console.error("[ChatInput] Upload voice failed:", err);
      } finally {
        setUploading(false);
      }
    };

    recorder.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isSendBlocked) {
    return (
      <ChatInputContainer>
        <Box
          sx={{
            py: 1.5,
            px: 2,
            textAlign: "center",
            bgcolor: "#F3F4F6",
            borderRadius: 2,
            color: "#6B7280",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Chỉ quản trị viên mới có quyền gửi tin nhắn trong nhóm này.
        </Box>
      </ChatInputContainer>
    );
  }

  return (
    <ChatInputContainer
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Mention Autocomplete Popper */}
      {mentionFilter !== null && filteredMembers.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            bottom: "100%",
            left: 12,
            right: 12,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 100,
            mb: 1,
            borderRadius: 2,
            border: "1px solid #E5E7EB",
          }}
        >
          <Box sx={{ px: 2, py: 0.8, bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748B" }}>
              Nhắc tên thành viên (@)
            </Typography>
          </Box>
          <List dense disablePadding>
            {filteredMembers.map((member: any, idx: number) => {
              const name = member.displayName || member.fullName || member.username;
              const isBot = member.isBot;
              return (
                <ListItemButton
                  key={member.userId}
                  selected={idx === mentionIndex}
                  onClick={() => selectMention(member)}
                  sx={{
                    py: 0.8,
                    "&.Mui-selected": { bgcolor: isBot ? "#F5F3FF" : "#EFF6FF" },
                    "&:hover": { bgcolor: isBot ? "#FAF5FF" : "#F1F5F9" },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 38 }}>
                    {isBot ? (
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          background: "linear-gradient(135deg, #7C3AED, #005AE0)",
                          color: "#fff",
                        }}
                      >
                        <SmartToyOutlinedIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                    ) : (
                      <Avatar src={member.avatarUrl} sx={{ width: 28, height: 28 }}>
                        {name?.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                        <span>{name}</span>
                        {isBot && (
                          <Box
                            component="span"
                            sx={{
                              fontSize: "10px",
                              fontWeight: 700,
                              px: 0.6,
                              py: 0.1,
                              borderRadius: "4px",
                              bgcolor: "#7C3AED",
                              color: "#fff",
                            }}
                          >
                            BOT AI
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      isBot
                        ? "Hỏi đáp, tóm tắt đoạn chat..."
                        : `@${member.username || ""}`
                    }
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: 11, color: isBot ? "#7C3AED" : undefined }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}

      {replyMessage && (
        <ComposerActionPreview
          replyMessage={{
            messageId: replyMessage.messageId,
            body: replyMessage.body,
            senderName: replyMessage.senderName,
          }}
          onCancelReply={onCancelReply}
        />
      )}

      <PendingAttachmentsList
        attachments={pendingAttachments}
        onRemove={handleRemoveAttachment}
      />

      {(smartReplies.length > 0 || loadingSmartReplies) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 0.8,
            overflowX: "auto",
            scrollbarWidth: "none",
            bgcolor: "rgba(124, 58, 237, 0.05)",
            borderTop: "1px solid rgba(124, 58, 237, 0.15)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 14, color: "#7C3AED" }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#7C3AED" }}>
              Gợi ý ZAi:
            </Typography>
          </Box>
          {loadingSmartReplies ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.2 }}>
              <CircularProgress size={13} sx={{ color: "#7C3AED" }} />
              <Typography sx={{ fontSize: 12, color: "#7C3AED" }}>
                Đang tạo gợi ý câu trả lời thông minh...
              </Typography>
            </Box>
          ) : (
            <>
              {smartReplies.map((reply, idx) => (
                <Chip
                  key={idx}
                  label={reply}
                  size="small"
                  clickable
                  onClick={() => handleSelectSmartReply(reply)}
                  sx={{
                    bgcolor: "#FFFFFF",
                    color: "#1E293B",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    "&:hover": {
                      bgcolor: "rgba(124, 58, 237, 0.1)",
                      borderColor: "#7C3AED",
                    },
                  }}
                />
              ))}
              <Tooltip title="Đổi gợi ý khác (Làm mới)" placement="top">
                <IconButton
                  size="small"
                  onClick={() => requestSmartReplies(true)}
                  sx={{ p: 0.3, color: "#7C3AED", "&:hover": { bgcolor: "rgba(124, 58, 237, 0.1)" } }}
                >
                  <RefreshRoundedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Đóng gợi ý" placement="top">
                <IconButton
                  size="small"
                  onClick={() => setSmartReplies([])}
                  sx={{ p: 0.3, color: "#94A3B8", ml: "auto" }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )}

      <DropZone isDragging={isDragging}>
        {isRecording ? (
          <VoiceRecordingBar>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
              <FiberManualRecordIcon
                sx={{
                  color: "#EF4444",
                  fontSize: 18,
                  animation: `${pulseRed} 1.2s infinite ease-in-out`,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#B91C1C" }}>
                Đang ghi âm: {formatTimer(recordingDuration)}
              </Typography>
            </Box>

            <Tooltip title="Hủy ghi âm">
              <IconButton onClick={cancelRecording} size="small" sx={{ color: "#64748B" }}>
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Gửi tin nhắn thoại">
              <IconButton
                onClick={sendRecording}
                size="small"
                sx={{
                  bgcolor: "#005AE0",
                  color: "#FFF",
                  "&:hover": { bgcolor: "#004BB5" },
                }}
              >
                <SendRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </VoiceRecordingBar>
        ) : (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              multiple
              onChange={handleImageChange}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
              hidden
              multiple
              onChange={handleFileChange}
            />

            <InputWrapper>
              {/* 1. Sticker / Emoji on the far left */}
              <EmojiWrap>
                <Tooltip title="Sticker / Emoji" placement="top">
                  <IconBtn onClick={() => setOpenEmoji((prev) => !prev)} disabled={disabled}>
                    <InsertEmoticonRoundedIcon fontSize="small" />
                  </IconBtn>
                </Tooltip>
                {openEmoji && (
                  <PickerBox>
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      width={320}
                      height={isMobile ? 350 : 400}
                      previewConfig={{ showPreview: false }}
                      searchDisabled={false}
                      skinTonesDisabled
                    />
                  </PickerBox>
                )}
              </EmojiWrap>

              {/* 2. Auto-expanding multiline InputField in the center */}
              <InputField
                ref={inputRef}
                rows={1}
                placeholder={t("CHAT.PLACEHOLDER") || "Nhập tin nhắn..."}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
              />

            {uploading && <CircularProgress size={16} sx={{ mx: 0.5 }} />}

            {/* 3. AI Smart Replies, Micro & Image collapse smoothly when text is typed */}
            {!hasText && !hasAttachments && (
              <>
                <Tooltip title="Gợi ý trả lời nhanh (ZAi)" placement="top">
                  <IconBtn
                    onClick={() => requestSmartReplies(true)}
                    disabled={disabled || uploading || loadingSmartReplies}
                    sx={{
                      color: "#7C3AED",
                      "&:hover": { bgcolor: "rgba(124, 58, 237, 0.08)" },
                    }}
                    aria-label="smart-replies"
                  >
                    <AutoAwesomeOutlinedIcon fontSize="small" />
                  </IconBtn>
                </Tooltip>

                <Tooltip title="Ghi âm tin nhắn thoại" placement="top">
                  <IconBtn onClick={startRecording} disabled={disabled || uploading}>
                    <MicRoundedIcon fontSize="small" />
                  </IconBtn>
                </Tooltip>

                <Tooltip title={t("CHAT.SEND_IMAGE")} placement="top">
                  <IconBtn
                    onClick={() => imageInputRef.current?.click()}
                    disabled={disabled || uploading}
                    aria-label="send-image"
                  >
                    <ImageOutlinedIcon fontSize="small" />
                  </IconBtn>
                </Tooltip>
              </>
            )}

            {/* 4. More utilities button (...) */}
            <Tooltip title="Thêm tiện ích" placement="top">
              <IconBtn
                onClick={(e) => setUtilitiesAnchor(e.currentTarget)}
                disabled={disabled || uploading}
                aria-label="more-utilities"
              >
                <MoreHorizRoundedIcon fontSize="small" />
              </IconBtn>
            </Tooltip>

            {/* 5. Blue Send Button when typing */}
            {(hasText || hasAttachments) && (
              <SendBtn onClick={handleSend} disabled={disabled || uploading}>
                <SendRoundedIcon fontSize="small" />
              </SendBtn>
            )}

            {/* Utilities Menu */}
            <Menu
              anchorEl={utilitiesAnchor}
              open={Boolean(utilitiesAnchor)}
              onClose={() => setUtilitiesAnchor(null)}
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              transformOrigin={{ vertical: "bottom", horizontal: "left" }}
              PaperProps={{
                sx: {
                  borderRadius: "10px",
                  minWidth: 230,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                  py: 0.5,
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setUtilitiesAnchor(null);
                  requestSmartReplies(true);
                }}
              >
                <ListItemIcon>
                  <AutoAwesomeOutlinedIcon fontSize="small" sx={{ color: "#7C3AED" }} />
                </ListItemIcon>
                <ListItemText
                  primary="Gợi ý trả lời nhanh (ZAi)"
                  secondary="AI tự động phân tích ngữ cảnh"
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 600, color: "#7C3AED" }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
              </MenuItem>
              {isGroupConv && onOpenCreatePoll && (
                <MenuItem
                  onClick={() => {
                    setUtilitiesAnchor(null);
                    onOpenCreatePoll();
                  }}
                >
                  <ListItemIcon>
                    <PollOutlinedIcon fontSize="small" sx={{ color: "#0068FF" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tạo bình chọn"
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                  />
                </MenuItem>
              )}

              {isGroupConv && onOpenCreateReminder && (
                <MenuItem
                  onClick={() => {
                    setUtilitiesAnchor(null);
                    onOpenCreateReminder();
                  }}
                >
                  <ListItemIcon>
                    <AlarmOutlinedIcon fontSize="small" sx={{ color: "#D97706" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tạo nhắc hẹn"
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                  />
                </MenuItem>
              )}

              {isGroupConv && onOpenCreateNote && (
                <MenuItem
                  onClick={() => {
                    setUtilitiesAnchor(null);
                    onOpenCreateNote();
                  }}
                >
                  <ListItemIcon>
                    <DescriptionOutlinedIcon fontSize="small" sx={{ color: "#2563EB" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tạo ghi chú"
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                  />
                </MenuItem>
              )}

              {isGroupConv && onOpenCreateTodo && (
                <MenuItem
                  onClick={() => {
                    setUtilitiesAnchor(null);
                    onOpenCreateTodo();
                  }}
                >
                  <ListItemIcon>
                    <AssignmentTurnedInOutlinedIcon fontSize="small" sx={{ color: "#7C3AED" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Giao việc (To-Do)"
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                  />
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  setUtilitiesAnchor(null);
                  fileInputRef.current?.click();
                }}
              >
                <ListItemIcon>
                  <AttachFileRoundedIcon fontSize="small" sx={{ color: "#4B5563" }} />
                </ListItemIcon>
                <ListItemText
                  primary="Gửi tập tin"
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                />
              </MenuItem>

              {onOpenShareContact && (
                <MenuItem
                  onClick={() => {
                    setUtilitiesAnchor(null);
                    onOpenShareContact();
                  }}
                >
                  <ListItemIcon>
                    <ContactPageOutlinedIcon fontSize="small" sx={{ color: "#059669" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Gửi danh thiếp"
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                  />
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  setUtilitiesAnchor(null);
                  handleShareLocation();
                }}
              >
                <ListItemIcon>
                  <LocationOnOutlinedIcon fontSize="small" sx={{ color: "#EA580C" }} />
                </ListItemIcon>
                <ListItemText
                  primary="Chia sẻ vị trí"
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                />
              </MenuItem>
            </Menu>
          </InputWrapper>
        </>
      )}
      </DropZone>
    </ChatInputContainer>
  );
}
