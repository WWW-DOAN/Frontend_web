"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";

import { useChatStore } from "@/src/common/store/useChatStore";
import { chatService, type MessageSearchParams } from "@/src/common/service/chat-service";
import type { AttachmentDto } from "@/src/common/interface/chat-interface";
import { useTrans } from "@/src/common/utilities/hook/trans";

const SearchContainer = styled(Box)({
  width: 320,
  height: "100%",
  borderLeft: "1px solid #E5E7EB",
  backgroundColor: "#FFFFFF",
  display: "flex",
  flexDirection: "column",
});

const SearchHeader = styled(Box)({
  padding: "14px 12px",
  borderBottom: "1px solid #E5E7EB",
});

const SearchContent = styled(Box)({
  flex: 1,
  overflowY: "auto",
  padding: "10px",
});

const ResultItem = styled(Box)({
  borderRadius: 8,
  marginBottom: 8,
  padding: "10px",
  border: "1px solid #F1F5F9",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "#F8FAFC",
  },
});

const MessagePreview = styled(Typography)({
  fontSize: 13,
  color: "#334155",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginBottom: 4,
});

interface Message {
  messageId: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName?: string;
  attachments?: AttachmentDto[];
  isDeleted?: boolean;
}

interface SearchSidebarProps {
  conversationId: string | null;
  onClose: () => void;
  onMessageClick: (message: Message) => void;
}

const normalize = (value: string) => value.toLowerCase().trim();

const getDateRange = (fromDate: string, toDate: string) => {
  const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : undefined;
  const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : undefined;
  return { from, to };
};

const matchesFileType = (attachments: AttachmentDto[] = [], fileType: MessageSearchParams["fileType"]) => {
  if (!fileType) return true;

  return attachments.some((attachment) => {
    const type = attachment.type;
    const contentType = attachment.contentType?.toLowerCase() || "";

    if (fileType === "images") return type === "image" || contentType.startsWith("image/");
    if (fileType === "video") return type === "video" || contentType.startsWith("video/");
    return (
      type === "document" ||
      type === "file" ||
      (!contentType.startsWith("image/") && !contentType.startsWith("video/"))
    );
  });
};

const SearchSidebar: React.FC<SearchSidebarProps> = ({ conversationId, onClose, onMessageClick }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [senderId, setSenderId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fileType, setFileType] = useState<NonNullable<MessageSearchParams["fileType"]> | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [apiResults, setApiResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const conversationDetailById = useChatStore((s) => s.conversationDetailById);
  const listConversation = useChatStore((s) => s.listConversation);
  const currentUserId = useChatStore((s) => s.currentUserId);
  const t = useTrans();
  const requestFailedMessage = t("SEARCH.REQUEST_FAILED");
  const invalidResponseMessage = t("SEARCH.INVALID_RESPONSE");

  const allMessages = conversationId ? messagesByConversation[conversationId] || [] : [];
  const conversation =
    (conversationId && conversationDetailById[conversationId]) ||
    listConversation.find((item) => item.id === conversationId);
  const members = conversation?.members || [];
  const dateRange = getDateRange(fromDate, toDate);
  const invalidDateRange = Boolean(dateRange.from && dateRange.to && dateRange.from > dateRange.to);
  const hasCriteria = Boolean(
    searchQuery.trim() || senderId || fromDate || toDate || fileType
  );
  const activeFilterCount = [senderId, fromDate, toDate, fileType].filter(Boolean).length;

  const searchResults = useMemo(() => {
    const keyword = normalize(searchQuery);
    if (!hasCriteria || invalidDateRange) return [];

    return [...allMessages]
      .reverse()
      .filter((msg) => {
        const timestamp = new Date(msg.createdAt).getTime();
        return (
          (!keyword || normalize(msg.body || "").includes(keyword)) &&
          (!senderId || msg.senderId === senderId) &&
          (!dateRange.from || timestamp >= dateRange.from) &&
          (!dateRange.to || timestamp <= dateRange.to) &&
          matchesFileType(msg.attachments, fileType || undefined)
        );
      })
      .slice(0, 50)
      .map((msg) => {
        const sender = members.find((member) => member.userId === msg.senderId);
        const senderName =
          sender?.displayName ||
          sender?.username ||
          (msg.senderId === currentUserId ? t("CHAT.YOU") : t("CHAT.USER"));

        return {
          messageId: msg.messageId,
          body: msg.body,
          createdAt: new Date(msg.createdAt).toISOString(),
          senderId: msg.senderId,
          senderName,
          attachments: msg.attachments,
          isDeleted: msg.isDeleted,
        };
      });
  }, [
    allMessages,
    currentUserId,
    dateRange.from,
    dateRange.to,
    fileType,
    hasCriteria,
    invalidDateRange,
    members,
    searchQuery,
    senderId,
    t,
  ]);

  const finalResults = apiResults ?? searchResults;

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (!conversationId || !hasCriteria || invalidDateRange) {
        setApiResults(null);
        setSearchError(null);
        setSearching(false);
        return;
      }

      const params: MessageSearchParams = {
        q: searchQuery.trim() || undefined,
        senderId: senderId || undefined,
        from: dateRange.from,
        to: dateRange.to,
        fileType: fileType || undefined,
      };

      setSearching(true);
      setSearchError(null);
      void chatService.searchMessages(conversationId, params)
        .then((res) => {
          if (!res.ok) {
            throw new Error((res.payload as any)?.message || requestFailedMessage);
          }

          const rows = (res?.payload as any)?.data;
          if (!Array.isArray(rows)) {
            throw new Error(invalidResponseMessage);
          }

          const normalized = rows.map((item: any) => {
            const timestamp = new Date(item.createdAt || item.created_at || Date.now()).getTime();
            return {
              messageId: item.messageId || item.id,
              body: item.body || item.content || "",
              createdAt: new Date(timestamp).toISOString(),
              senderId: item.senderId || item.sender_id || "",
              senderName: item.senderName || item.sender_name,
              attachments: Array.isArray(item.attachments) ? item.attachments : [],
              isDeleted: Boolean(item.isDeleted),
            } satisfies Message;
          });
          if (active) setApiResults(normalized);
        })
        .catch((error: unknown) => {
          if (active) {
            setApiResults(null);
            setSearchError(error instanceof Error ? error.message : requestFailedMessage);
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    conversationId,
    dateRange.from,
    dateRange.to,
    fileType,
    hasCriteria,
    invalidDateRange,
    invalidResponseMessage,
    requestFailedMessage,
    searchQuery,
    senderId,
  ]);

  const clearFilters = () => {
    setSenderId("");
    setFromDate("");
    setToDate("");
    setFileType("");
  };

  return (
    <SearchContainer>
      <SearchHeader>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
            {t("SEARCH.TITLE")}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label={t("COMMON.CLOSE")}>
            <ClearIcon />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder={t("SEARCH.PLACEHOLDER")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: "#94A3B8", mr: 1 }} />,
            endAdornment: searchQuery ? (
              <IconButton size="small" onClick={() => setSearchQuery("")} aria-label={t("SEARCH.CLEAR_QUERY")}>
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : null,
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          <Button
            size="small"
            startIcon={<FilterListOutlinedIcon />}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            {t("SEARCH.FILTERS")}
          </Button>
          {activeFilterCount > 0 && (
            <Chip label={activeFilterCount} size="small" color="primary" />
          )}
        </Box>
        <Collapse in={filtersOpen}>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="search-sender-label">{t("SEARCH.FILTER_SENDER")}</InputLabel>
              <Select
                labelId="search-sender-label"
                value={senderId}
                label={t("SEARCH.FILTER_SENDER")}
                onChange={(event) => setSenderId(event.target.value)}
              >
                <MenuItem value="">{t("SEARCH.ALL_SENDERS")}</MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.userId} value={member.userId}>
                    {member.displayName || member.username || member.userId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t("SEARCH.FILTER_FROM_DATE")}
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: toDate || undefined }}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t("SEARCH.FILTER_TO_DATE")}
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: fromDate || undefined }}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="search-file-type-label">{t("SEARCH.FILTER_FILE_TYPE")}</InputLabel>
              <Select
                labelId="search-file-type-label"
                value={fileType}
                label={t("SEARCH.FILTER_FILE_TYPE")}
                onChange={(event) =>
                  setFileType(event.target.value as NonNullable<MessageSearchParams["fileType"]>)
                }
              >
                <MenuItem value="">{t("SEARCH.ALL_FILE_TYPES")}</MenuItem>
                <MenuItem value="images">{t("SEARCH.IMAGES")}</MenuItem>
                <MenuItem value="video">{t("SEARCH.VIDEOS")}</MenuItem>
                <MenuItem value="files">{t("SEARCH.FILES")}</MenuItem>
              </Select>
            </FormControl>
            {activeFilterCount > 0 && (
              <Button size="small" onClick={clearFilters} sx={{ alignSelf: "flex-start" }}>
                {t("SEARCH.CLEAR_FILTERS")}
              </Button>
            )}
          </Stack>
        </Collapse>
        {invalidDateRange && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t("SEARCH.INVALID_DATE_RANGE")}
          </Alert>
        )}
      </SearchHeader>

      <SearchContent>
        {hasCriteria && !invalidDateRange && (
          <Box sx={{ mb: 1.5 }}>
            <Chip label={t("SEARCH.RESULTS_LABEL", { count: finalResults.length })} size="small" color="primary" variant="outlined" />
          </Box>
        )}

        {searchError && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            <strong>{t("SEARCH.ERROR_PREFIX")}</strong> {searchError}
          </Alert>
        )}

        {searching ? (
          <Typography variant="body2" sx={{ textAlign: "center", py: 4 }}>
            {t("SEARCH.SEARCHING")}
          </Typography>
        ) : finalResults.length > 0 ? (
          finalResults.map((message) => (
            <ResultItem key={message.messageId} onClick={() => onMessageClick(message)}>
              <MessagePreview>
                {message.isDeleted ? t("CHAT.MESSAGE_DELETED") : message.body || t("SEARCH.NO_CONTENT")}
              </MessagePreview>
              {message.senderName && (
                <Typography variant="caption" display="block" color="#64748B">
                  {message.senderName}
                </Typography>
              )}
              <Typography variant="caption" color="#94A3B8">
                {new Date(message.createdAt).toLocaleString()}
              </Typography>
            </ResultItem>
          ))
        ) : hasCriteria && !invalidDateRange ? (
          <Typography variant="body2" sx={{ textAlign: "center", py: 4 }}>
            {t("SEARCH.NO_RESULTS")}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ textAlign: "center", py: 4, color: "#94A3B8" }}>
            {t("SEARCH.ENTER_KEYWORD")}
          </Typography>
        )}
      </SearchContent>
    </SearchContainer>
  );
};

export default SearchSidebar;
