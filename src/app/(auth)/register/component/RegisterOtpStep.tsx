"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import OtpInput from "@/src/shared/component/OtpInput";

interface RegisterOtpStepProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  errorMsg: string | null;
  devOtp?: string | null;
}

export default function RegisterOtpStep({
  email,
  onVerify,
  onResendOtp,
  onBack,
  loading,
  errorMsg,
  devOtp,
}: RegisterOtpStepProps) {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(300);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await onResendOtp();
    setCooldown(60);
    setExpirySeconds(300);
  };

  const handleComplete = (code: string) => {
    if (!loading && code.length === 6) {
      onVerify(code);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ padding: { xs: "24px 24px", sm: "28px 64px 36px" } }}>
      <Box sx={{ textAlign: "center" }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            bgcolor: "#EFF6FF",
            color: "#0068FF",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
          }}
        >
          <MarkEmailReadRoundedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="#1E293B">
          Xác thực mã OTP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Mã xác thực gồm 6 chữ số đã được gửi đến email:
        </Typography>
        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
          {email}
        </Typography>
      </Box>

      {devOtp && (
        <Alert severity="info" sx={{ fontSize: 13, py: 0.5 }}>
          [Dev Mode] Mã OTP thử nghiệm của bạn là: <strong>{devOtp}</strong>
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ fontSize: 13, py: 0.5 }}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ my: 1 }}>
        <OtpInput
          value={otp}
          onChange={setOtp}
          onComplete={handleComplete}
          disabled={loading}
        />
        <Typography
          variant="caption"
          color={expirySeconds <= 60 ? "error.main" : "text.secondary"}
          sx={{ display: "block", textAlign: "center", mt: 0.5, fontWeight: 500 }}
        >
          {expirySeconds > 0
            ? `Mã có hiệu lực trong: ${formatTime(expirySeconds)}`
            : "Mã OTP đã hết hạn, vui lòng gửi lại mã mới"}
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={() => onVerify(otp)}
        disabled={loading || otp.length < 6 || expirySeconds <= 0}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRoundedIcon />}
        sx={{
          py: 1.3,
          borderRadius: "8px",
          fontWeight: 700,
          textTransform: "none",
          fontSize: 15,
          bgcolor: "#0068FF",
          "&:hover": { bgcolor: "#0052CC" },
        }}
      >
        {loading ? "Đang xác thực..." : "Xác nhận & Tạo tài khoản"}
      </Button>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon fontSize="small" />}
          onClick={onBack}
          disabled={loading}
          sx={{ textTransform: "none", color: "#64748B" }}
        >
          Đổi email khác
        </Button>
        <Button
          size="small"
          onClick={handleResend}
          disabled={cooldown > 0 || loading}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: cooldown > 0 ? "#94A3B8" : "#0068FF",
          }}
        >
          {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : "Gửi lại mã OTP"}
        </Button>
      </Box>
    </Stack>
  );
}
