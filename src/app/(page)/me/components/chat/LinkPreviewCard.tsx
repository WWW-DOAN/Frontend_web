"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import { styled } from "@mui/material/styles";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LanguageIcon from "@mui/icons-material/Language";
import { chatService } from "@/src/common/service/chat-service";

interface LinkPreviewCardProps {
  url: string;
  isOwn?: boolean;
}

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

const previewCache = new Map<string, LinkPreviewData>();

const FallbackCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isOwn",
})<{ isOwn?: boolean }>(({ isOwn }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 8,
  background: isOwn ? "rgba(0, 0, 0, 0.04)" : "#F0F9FF",
  border: `1px solid ${isOwn ? "rgba(0, 0, 0, 0.08)" : "#BAE6FD"}`,
  cursor: "pointer",
  transition: "all 0.15s ease",
  maxWidth: 320,
  "&:hover": {
    background: isOwn ? "rgba(0, 0, 0, 0.07)" : "#E0F2FE",
  },
}));

export default function LinkPreviewCard({ url, isOwn }: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null>(previewCache.get(url) || null);
  const [loading, setLoading] = useState<boolean>(!previewCache.has(url));

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url)!);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    chatService
      .getLinkPreview(url)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && res.data.data) {
          const preview = res.data.data;
          previewCache.set(url, preview);
          setData(preview);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const domain = React.useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [url]);

  if (loading) {
    return (
      <Box sx={{ mt: 1, p: 1.2, maxWidth: 360, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
        <Skeleton variant="text" width="60%" height={18} />
        <Skeleton variant="text" width="90%" height={14} />
      </Box>
    );
  }

  // If OpenGraph title was retrieved, display full rich card
  if (data?.title) {
    return (
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          mt: 1,
          mb: 0.5,
          display: "block",
          textDecoration: "none",
          color: "inherit",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid #E2E8F0",
          bgcolor: isOwn ? "rgba(255, 255, 255, 0.95)" : "#FFFFFF",
          transition: "all 0.2s ease-in-out",
          maxWidth: 380,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          "&:hover": {
            borderColor: "#0068FF",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 14px rgba(0, 104, 255, 0.12)",
          },
        }}
      >
        {data.image && (
          <Box
            sx={{
              width: "100%",
              height: 130,
              bgcolor: "#F1F5F9",
              backgroundImage: `url(${data.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <Box sx={{ p: 1.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.4 }}>
            <LanguageIcon sx={{ fontSize: 13, color: "#64748B" }} />
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {data.siteName || domain}
            </Typography>
            <OpenInNewIcon sx={{ fontSize: 11, color: "#94A3B8", ml: "auto" }} />
          </Box>

          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1E293B",
              lineHeight: 1.35,
              mb: 0.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.title}
          </Typography>

          {data.description && (
            <Typography
              sx={{
                fontSize: 11.5,
                color: "#475569",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {data.description}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Fallback simple link card
  return (
    <FallbackCard isOwn={isOwn} onClick={() => window.open(url, "_blank")}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "#E0F2FE",
        }}
      >
        <LinkRoundedIcon sx={{ fontSize: 16, color: "#0284C7" }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: "#0284C7",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: "underline",
          }}
        >
          {url}
        </Typography>
        <Typography sx={{ fontSize: 10, color: "#94A3B8", mt: 0.3 }}>
          {domain}
        </Typography>
      </Box>
    </FallbackCard>
  );
}
