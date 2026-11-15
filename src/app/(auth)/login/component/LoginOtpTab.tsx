"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import OtpInput from "@/src/shared/component/OtpInput";
import { authService } from "@/src/common/service/auth-service";
import { useAuthStore } from "@/src/common/store/useAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface LoginOtpTabProps {
  onGoRegister: () => void;
}

export default function LoginOtpTab({ onGoRegister }: LoginOtpTabProps) {
  const router = useRouter();
  const setAuthData = useAuthStore((s) => s.setAuthData);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authService.loginSendOtp({ email: email.trim() });
      if (res?.ok === false) {
        setError(res?.payload?.message || "Không thể gửi mã đăng nhập");
        return;
      }
      toast.success("Mã OTP đăng nhập đã được gửi đến email");
      setCooldown(60);
      setStep(2);
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi gửi mã");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (code.length < 6) {
      setError("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await authService.loginVerifyOtp({
        email: email.trim(),
        otp: code.trim(),
      });

      if (res?.ok === false || !(res as any)?.payload?.accessToken) {
        setError((res as any)?.payload?.message || "Mã xác thực không chính xác");
        return;
      }

      const authData = (res as any)?.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", authData.accessToken);
        localStorage.setItem("refreshToken", authData.refreshToken);
        localStorage.setItem("currentUserId", authData.user.id);
      }

      setAuthData({
        success: true,
        data: authData,
      });

      toast.success("Đăng nhập thành công!");
      router.replace("/me");
    } catch (err: any) {
      setError(err?.message || "Xác thực thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ padding: { xs: "16px 24px", sm: "20px 48px" } }}>
      {error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {step === 1 ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Đăng nhập nhanh mà không cần mật khẩu. Chúng tôi sẽ gửi một mã OTP 6 số đến email của bạn.
          </Typography>

          <TextField
            fullWidth
            size="medium"
            placeholder="Nhập email tài khoản Zalo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendOtp();
              }
            }}
            InputProps={{
              startAdornment: (
                <EmailRoundedIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
              ),
            }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSendOtp}
            disabled={loading || !email.trim()}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
            sx={{
              py: 1.2,
              borderRadius: "8px",
              fontWeight: 600,
              textTransform: "none",
              fontSize: 15,
            }}
          >
            {loading ? "Đang gửi mã..." : "Gửi mã đăng nhập"}
          </Button>
        </>
      ) : (
        <>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Mã xác thực 6 số đã được gửi tới:
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main">
              {email}
            </Typography>
          </Box>

          <Box sx={{ my: 0.5 }}>
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(code) => handleVerifyOtp(code)}
              disabled={loading}
            />
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => handleVerifyOtp()}
            disabled={loading || otp.length < 6}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRoundedIcon />}
            sx={{
              py: 1.2,
              borderRadius: "8px",
              fontWeight: 600,
              textTransform: "none",
              fontSize: 15,
            }}
          >
            {loading ? "Đang xác thực..." : "Xác nhận & Đăng nhập"}
          </Button>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1 }}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon fontSize="small" />}
              onClick={() => {
                setStep(1);
                setOtp("");
                setError(null);
              }}
              disabled={loading}
            >
              Đổi email
            </Button>
            <Button
              size="small"
              onClick={handleSendOtp}
              disabled={cooldown > 0 || loading}
            >
              {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : "Gửi lại mã OTP"}
            </Button>
          </Box>
        </>
      )}

      <Box sx={{ textAlign: "center", pt: 2, borderTop: "1px solid #F1F5F9" }}>
        <Typography variant="body2" color="text.secondary">
          Bạn chưa có tài khoản?{" "}
          <Box
            component="span"
            onClick={onGoRegister}
            sx={{
              color: "#0068FF",
              fontWeight: 600,
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Đăng ký ngay
          </Box>
        </Typography>
      </Box>
    </Stack>
  );
}
