"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SubdirectoryArrowLeftRoundedIcon from "@mui/icons-material/SubdirectoryArrowLeftRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import type { AttachmentDto, UiMessage } from "@/src/common/interface/chat-interface";
import { resolveMediaUrl } from "@/src/common/helpers/displayMedia.helpers";
import { buildS3Url } from "@/src/common/components/MediaPreviewModal";
import { useTrans } from "@/src/common/utilities/hook/trans";

type GalleryTab = "media" | "files" | "links";
type GalleryRecord = {
  messageId: string;
  createdAt: number;
  senderName: string;
  attachment?: AttachmentDto;
  link?: string;
  messageBody: string;
};

interface ConversationMediaGalleryProps {
  open: boolean;
  initialTab: GalleryTab;
  messages: UiMessage[];
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
  onPreviewMedia: (items: AttachmentDto[], index: number) => void;
}

const getContentType = (attachment: AttachmentDto) =>
  (attachment.contentType || (attachment as AttachmentDto & { content_type?: string }).content_type || "").toLowerCase();

const isMediaAttachment = (attachment: AttachmentDto) => {
  const type = attachment.type?.toLowerCase();
  const contentType = getContentType(attachment);
  return type === "image" || type === "video" || contentType.startsWith("image/") || contentType.startsWith("video/");
};

const isGalleryFile = (attachment: AttachmentDto) => {
  const type = attachment.type?.toLowerCase();
  const contentType = getContentType(attachment);
  return (
    type === "document" ||
    type === "file" ||
    type === "audio" ||
    contentType.startsWith("audio/")
  );
};

const getLinks = (body: string) =>
  (body.match(/https?:\/\/[^\s<>"']+/gi) || [])
    .map((link) => link.replace(/[),.!?;:\]}]+$/, ""))
    .filter((link) => {
      try {
        const url = new URL(link);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    });

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ConversationMediaGallery({
  open,
  initialTab,
  messages,
  onClose,
  onNavigateToMessage,
  onPreviewMedia,
}: ConversationMediaGalleryProps) {
  const t = useTrans();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeTab, setActiveTab] = useState<GalleryTab>(initialTab);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setQuery("");
      setSortOrder("newest");
    }
  }, [initialTab, open]);

  const records = useMemo(() => {
    const media: GalleryRecord[] = [];
    const files: GalleryRecord[] = [];
    const links: GalleryRecord[] = [];

    messages.forEach((message) => {
      if (message.isDeleted || message.pending || message.failed) return;
      const base = {
        messageId: message.messageId,
        createdAt: Number(message.createdAt),
        senderName: message.senderName || message.senderId,
        messageBody: message.body || "",
      };

      (message.attachments || []).forEach((attachment) => {
        if (isMediaAttachment(attachment)) {
          media.push({ ...base, attachment });
        } else if (isGalleryFile(attachment)) {
          files.push({ ...base, attachment });
        }
      });

      getLinks(message.body || "").forEach((link) => {
        links.push({ ...base, link });
      });
    });

    return { media, files, links };
  }, [messages]);

  const activeRecords = records[activeTab];
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...activeRecords]
      .filter((record) => {
        if (!normalizedQuery) return true;
        const searchableText = [
          record.attachment?.name,
          record.link,
          record.senderName,
          record.messageBody,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(normalizedQuery);
      })
      .sort((first, second) =>
        sortOrder === "newest"
          ? second.createdAt - first.createdAt
          : first.createdAt - second.createdAt
      );
  }, [activeRecords, query, sortOrder]);

  const visibleMediaItems = useMemo(
    () =>
      filteredRecords
        .map((record) => record.attachment)
        .filter((attachment): attachment is AttachmentDto => Boolean(attachment)),
    [filteredRecords]
  );

  const tabCounts: Record<GalleryTab, number> = {
    media: records.media.length,
    files: records.files.length,
    links: records.links.length,
  };

  const navigateToMessage = (messageId: string) => {
    onNavigateToMessage(messageId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="conversation-media-gallery-title"
    >
      <DialogTitle
        id="conversation-media-gallery-title"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}
      >
        <Typography component="span" variant="h6" fontWeight={700}>
          {t("CONVO.GALLERY_TITLE")}
        </Typography>
        <IconButton onClick={onClose} aria-label={t("COMMON.CLOSE")} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: "8px !important" }}>
        <Tabs
          value={activeTab}
          onChange={(_, value: GalleryTab) => setActiveTab(value)}
          variant="fullWidth"
          aria-label={t("CONVO.GALLERY_TITLE")}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
        >
          <Tab
            value="media"
            icon={<ImageOutlinedIcon />}
            iconPosition="start"
            label={`${t("CONVO.MEDIA_TITLE")} (${tabCounts.media})`}
          />
          <Tab
            value="files"
            icon={<DescriptionOutlinedIcon />}
            iconPosition="start"
            label={`${t("CONVO.FILE_TITLE")} (${tabCounts.files})`}
          />
          <Tab
            value="links"
            icon={<LinkRoundedIcon />}
            iconPosition="start"
            label={`${t("CONVO.LINK_TITLE")} (${tabCounts.links})`}
          />
        </Tabs>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("CONVO.GALLERY_SEARCH")}
            inputProps={{ "aria-label": t("CONVO.GALLERY_SEARCH") }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
            <Select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
              inputProps={{ "aria-label": t("CONVO.GALLERY_SORT") }}
            >
              <MenuItem value="newest">{t("CONVO.GALLERY_NEWEST")}</MenuItem>
              <MenuItem value="oldest">{t("CONVO.GALLERY_OLDEST")}</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Box sx={{ maxHeight: fullScreen ? "calc(100vh - 230px)" : "60vh", overflowY: "auto", pr: 0.5 }}>
          {filteredRecords.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
              {query ? t("CONVO.GALLERY_NO_RESULTS") : t("CONVO.GALLERY_EMPTY")}
            </Typography>
          ) : activeTab === "media" ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 1.5,
              }}
            >
              {filteredRecords.map((record, index) => {
                const attachment = record.attachment;
                if (!attachment) return null;
                const isVideo = attachment.type === "video" || getContentType(attachment).startsWith("video/");
                const src = resolveMediaUrl(attachment.thumbnailUrl || attachment.url || attachment.key);
                return (
                  <Box
                    key={`${record.messageId}-${attachment.id || attachment.key || index}`}
                    sx={{ minWidth: 0, border: "1px solid #E2E8F0", borderRadius: 1.5, overflow: "hidden" }}
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onPreviewMedia(visibleMediaItems, index)}
                      aria-label={t("CONVO.GALLERY_PREVIEW", { name: attachment.name || t("CHAT.FILE") })}
                      sx={{
                        display: "block",
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        p: 0,
                        border: 0,
                        cursor: "pointer",
                        overflow: "hidden",
                        bgcolor: "#E2E8F0",
                      }}
                    >
                      {src ? (
                        isVideo ? (
                          <Box component="video" src={src} muted playsInline preload="metadata" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Box component="img" src={src} alt={attachment.name || ""} loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )
                      ) : (
                        <ImageOutlinedIcon sx={{ position: "absolute", inset: 0, m: "auto", color: "text.secondary" }} />
                      )}
                      {isVideo && (
                        <PlayArrowRoundedIcon
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            color: "white",
                            filter: "drop-shadow(0 1px 3px #000)",
                          }}
                        />
                      )}
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 1, py: 0.75 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap variant="caption" fontWeight={600}>
                          {attachment.name || t("CHAT.FILE")}
                        </Typography>
                        <Typography noWrap display="block" variant="caption" color="text.secondary">
                          {formatDate(record.createdAt)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        aria-label={t("CONVO.GALLERY_OPEN_MESSAGE")}
                        onClick={() => navigateToMessage(record.messageId)}
                      >
                        <SubdirectoryArrowLeftRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Stack spacing={0.75}>
              {filteredRecords.map((record, index) => {
                const attachment = record.attachment;
                const url = record.link || (attachment?.url || buildS3Url(attachment?.key));
                const label = record.link || attachment?.name || t("CHAT.FILE");
                return (
                  <Box
                    key={`${record.messageId}-${record.link || attachment?.id || attachment?.key || index}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.25,
                      border: "1px solid #E2E8F0",
                      borderRadius: 1.5,
                      "&:hover": { bgcolor: "#F8FAFC" },
                    }}
                  >
                    {activeTab === "files" ? (
                      <DescriptionOutlinedIcon color="primary" />
                    ) : (
                      <LinkRoundedIcon color="primary" />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {url ? (
                        <Box
                          component="a"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: "block",
                            overflow: "hidden",
                            color: "primary.main",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {label}
                        </Box>
                      ) : (
                        <Typography noWrap>{label}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {record.senderName} · {formatDate(record.createdAt)}
                      </Typography>
                    </Box>
                    {url && (
                      <IconButton
                        size="small"
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("CONVO.GALLERY_OPEN_LINK")}
                      >
                        <OpenInNewRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      aria-label={t("CONVO.GALLERY_OPEN_MESSAGE")}
                      onClick={() => navigateToMessage(record.messageId)}
                    >
                      <SubdirectoryArrowLeftRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t("CONVO.GALLERY_HISTORY_HINT")}
          </Typography>
          <Chip size="small" variant="outlined" label={t("CONVO.GALLERY_COUNT", { count: filteredRecords.length })} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
