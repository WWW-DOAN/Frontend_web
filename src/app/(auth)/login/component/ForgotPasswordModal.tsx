"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import HttpsRoundedIcon from "@mui/icons-material/HttpsRounded";
import OtpInput from "@/src/shared/component/OtpInput";
import { authService } from "@/src/common/service/auth-service";
import { toast } from "react-toastify";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ForgotPasswordModal({
  open,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setCooldown(0);
    }
  }, [open]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Vui lòng nhập email hợp lệ");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await authService.forgotPasswordSendOtp({ email: email.trim() });
      if (res?.ok === false) {
        setError(res?.payload?.message || "Không thể gửi mã khôi phục");
        return;
      }
      toast.success("Đã gửi mã xác thực đến email");
      setCooldown(60);
      setStep(2);
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi gửi mã");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length < 6) {
      setError("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await authService.forgotPasswordReset({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      if (res?.ok === false) {
        setError(res?.payload?.message || "Đặt lại mật khẩu thất bại");
        return;
      }
      toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LockResetRoundedIcon color="primary" />
          <Typography fontWeight={700} fontSize={18}>
            {step === 1 ? "Quên mật khẩu" : "Đặt lại mật khẩu"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
            {error}
          </Alert>
        )}

        {step === 1 ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Nhập email đã đăng ký tài khoản Zalo của bạn. Chúng tôi sẽ gửi mã OTP gồm 6 chữ số để xác thực đặt lại mật khẩu.
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Email"
              placeholder="example@gmail.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <EmailRoundedIcon color="action" sx={{ mr: 1, fontSize: 18 }} />
                ),
              }}
            />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Mã xác thực đã được gửi tới email:
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                {email}
              </Typography>
            </Box>

            <Box sx={{ my: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mb: 0.5 }}>
                Nhập 6 số OTP
              </Typography>
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={() => {}}
                disabled={loading}
              />
            </Box>

            <TextField
              fullWidth
              size="small"
              label="Mật khẩu mới"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <HttpsRoundedIcon color="action" sx={{ mr: 1, fontSize: 18 }} />
                ),
              }}
            />

            <TextField
              fullWidth
              size="small"
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <HttpsRoundedIcon color="action" sx={{ mr: 1, fontSize: 18 }} />
                ),
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                size="small"
                startIcon={<ArrowBackIcon fontSize="small" />}
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Nhập lại email
              </Button>
              <Button
                size="small"
                onClick={handleSendOtp}
                disabled={cooldown > 0 || loading}
              >
                {cooldown > 0 ? `Gửi lại sau (${cooldown}s)` : "Gửi lại mã OTP"}
              </Button>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Hủy
        </Button>
        {step === 1 ? (
          <Button
            variant="contained"
            onClick={handleSendOtp}
            disabled={loading || !email.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Đang gửi mã..." : "Gửi mã xác thực"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={loading || otp.length < 6 || !newPassword}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? "Đang lưu..." : "Xác nhận & Đổi mật khẩu"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
