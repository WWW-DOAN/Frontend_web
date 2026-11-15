"use client";

import { chatService } from "@/src/common/service/chat-service";
import { Box, Button, CircularProgress, Typography, Paper } from "@mui/material";
import { GroupAdd, CheckCircle, ErrorOutline } from "@mui/icons-material";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function JoinGroupPage() {
  const router = useRouter();
  const routeParams = useParams();
  const code = (routeParams?.code as string) || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!code) return;
    chatService
      .joinGroupByCode(code)
      .then((res: any) => {
        const payload =
          res?.payload?.data ?? res?.payload ?? res?.data;
        const cid = payload?.conversationId ?? res?.conversationId;
        if (cid) {
          setConversationId(cid);
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(payload?.message || "Không tìm thấy nhóm.");
        }
      })
      .catch((err: any) => {
        setStatus("error");
        const msg =
          err?.response?.data?.message ??
          err?.payload?.message ??
          err?.message ??
          "Liên kết mời không hợp lệ hoặc đã hết hạn.";
        setErrorMsg(msg);
      });
  }, [code]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 4,
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          borderRadius: 3,
        }}
      >
        {status === "loading" && (
          <>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6">Đang tham gia nhóm...</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Vui lòng chờ trong giây lát
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle sx={{ fontSize: 56, color: "#22C55E", mb: 2 }} />
            <Typography variant="h6" fontWeight={600}>
              Tham gia nhóm thành công!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Bạn đã được thêm vào nhóm.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() =>
                router.push(
                  conversationId ? `/me?conversation=${conversationId}` : "/me"
                )
              }
            >
              Mở cuộc trò chuyện
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <ErrorOutline sx={{ fontSize: 56, color: "#EF4444", mb: 2 }} />
            <Typography variant="h6" fontWeight={600}>
              Không thể tham gia
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              {errorMsg}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexDirection: "column" }}>
              <Button
                variant="contained"
                startIcon={<GroupAdd />}
                onClick={() => router.push("/me")}
              >
                Về trang chính
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
