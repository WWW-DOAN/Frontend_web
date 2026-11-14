"use client";

import { useRef, useState, useCallback, useEffect } from "react";
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
} from "@mui/material";
import { sendTyping, sendStopTyping } from "@/src/common/action/chat.action";
import { styled, keyframes } from "@mui/material/styles";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import dynamic from "next/dynamic";
import InsertEmoticonRoundedIcon from "@mui/icons-material/InsertEmoticonRounded";
import { EmojiClickData } from "emoji-picker-react";
import ComposerActionPreview from "./ComposerActionPreview";
import PendingAttachmentsList from "./PendingAttachmentsList";
import { ChatAttachmentPayload } from "@/src/common/interface/media-interface";
import { uploadMedia } from "@/src/common/service/media-service";
import { useChatStore } from "@/src/common/store/useChatStore";
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
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  padding: "2px 8px",
  gap: 1,
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  "&:focus-within": {
    borderColor: "#005AE0",
    boxShadow: "0 0 0 2px rgba(0, 90, 224, 0.1)",
    background: "#FFFFFF",
  },
  "@media (max-width: 767px)": {
    padding: "0 4px",
    gap: 0,
  },
});

const InputField = styled("input")({
  flex: 1,
  minHeight: 36,
  maxHeight: 100,
  border: "none",
  background: "transparent",
  padding: "6px 4px",
  fontSize: 14,
  color: "#0F172A",
  outline: "none",
  resize: "none",
  fontFamily: "inherit",
  lineHeight: 1.5,
  "&::placeholder": {
    color: "#94A3B8",
  },
});

const IconBtn = styled(IconButton)({
  width: 34,
  height: 34,
  minWidth: 34,
  color: "#64748B",
  borderRadius: 10,
  flexShrink: 0,
  "&:hover": {
    background: "rgba(0, 0, 0, 0.06)",
    color: "#005AE0",
  },
  "@media (max-width: 767px)": {
    width: 40,
    height: 40,
    minWidth: 40,
  },
});

const SendBtn = styled(IconButton)({
  width: 34,
  height: 34,
  minWidth: 34,
  borderRadius: 10,
  backgroundColor: "#005AE0",
  color: "#FFFFFF",
  flexShrink: 0,
  "&:hover": {
    backgroundColor: "#004BB5",
  },
  "&:disabled": {
    backgroundColor: "#E5E7EB",
    color: "#94A3B8",
  },
  "@media (max-width: 767px)": {
    width: 40,
    height: 40,
    minWidth: 40,
  },
});

const EmojiWrap = styled(Box)({
  position: "relative",
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
}: ChatInputProps) {
  const isMobile = useMediaQuery("(max-width:767px)");
  const [value, setValue] = useState("");
  const [openEmoji, setOpenEmoji] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentPayload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasText = !!value.trim();
  const hasAttachments = pendingAttachments.length > 0;
  const lastTypingTime = useRef<number>(0);
  const currentUserId = useChatStore((state) => state.currentUserId);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversationDetailById = useChatStore((state) => state.conversationDetailById);
  const listConversation = useChatStore((state) => state.listConversation);
  const t = useTrans();

  // Active group members for @mention
  const conv = activeConversationId
    ? conversationDetailById[activeConversationId] || listConversation.find((c) => c.id === activeConversationId)
    : null;
  const isGroup = conv?.type === "GROUP";
  const members = (conv?.members || []).filter((m: any) => m.userId !== currentUserId);

  const filteredMembers = mentionFilter !== null
    ? members.filter((m: any) => {
        const name = (m.displayName || m.fullName || m.username || "").toLowerCase();
        return name.includes(mentionFilter);
      })
    : [];

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

  // Mention trigger check
  const checkMention = (text: string, cursorPos: number) => {
    if (!isGroup) {
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setValue(val);
      checkMention(val, e.target.selectionStart || val.length);

      if (conversationId) {
        const now = Date.now();
        if (now - lastTypingTime.current >= 1000) {
          lastTypingTime.current = now;
          sendTyping(conversationId);
        }
      }
    },
    [conversationId, isGroup]
  );

  const handleSend = () => {
    const text = value.trim();
    if ((!text && !hasAttachments) || disabled) return;
    onSend(text, pendingAttachments);
    if (conversationId) sendStopTyping(conversationId);
    setValue("");
    setPendingAttachments([]);
    setOpenEmoji(false);
    setMentionFilter(null);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
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
              return (
                <ListItemButton
                  key={member.userId}
                  selected={idx === mentionIndex}
                  onClick={() => selectMention(member)}
                  sx={{
                    py: 0.8,
                    "&.Mui-selected": { bgcolor: "#EFF6FF" },
                    "&:hover": { bgcolor: "#F1F5F9" },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 38 }}>
                    <Avatar src={member.avatarUrl} sx={{ width: 28, height: 28 }}>
                      {name?.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={name}
                    secondary={`@${member.username || ""}`}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
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
          <InputWrapper>
            <Tooltip title={t("CHAT.SEND_IMAGE")} placement="top">
              <IconBtn
                onClick={() => imageInputRef.current?.click()}
                disabled={disabled || uploading}
                aria-label="send-image"
              >
                <ImageOutlinedIcon fontSize="small" />
              </IconBtn>
            </Tooltip>

            <Tooltip title={t("CHAT.SEND_FILE")} placement="top">
              <IconBtn
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                aria-label="send-file"
              >
                <AttachFileRoundedIcon fontSize="small" />
              </IconBtn>
            </Tooltip>

            {uploading && <CircularProgress size={16} sx={{ mx: 1 }} />}

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

            <InputField
              ref={inputRef}
              placeholder={t("CHAT.PLACEHOLDER") || "Nhập tin nhắn..."}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />

            <EmojiWrap>
              <Tooltip title="Emoji" placement="top">
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

            {hasText || hasAttachments ? (
              <SendBtn onClick={handleSend} disabled={disabled || uploading}>
                <SendRoundedIcon fontSize="small" />
              </SendBtn>
            ) : (
              <Tooltip title="Ghi âm tin nhắn thoại" placement="top">
                <IconBtn onClick={startRecording} disabled={disabled || uploading}>
                  <MicRoundedIcon fontSize="small" />
                </IconBtn>
              </Tooltip>
            )}
          </InputWrapper>
        )}
      </DropZone>
    </ChatInputContainer>
  );
}
