"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormik } from "formik";

import {
    Page, Content, LogoWrap, Subtitle, Card,
    TabContainer, CardHeader,
    AuthHeader,
} from "../Auth.styles";
import { useAuthStore } from "@/src/common/store/useAuthStore";
import { initialValues, validationSchemaRegisForm } from "./validate";
import { authService } from "@/src/common/service/auth-service";
import { useTrans } from "@/src/common/utilities/hook/trans";
import FormRegis from "./component/FormRegis";
import RegisterOtpStep from "./component/RegisterOtpStep";
import { IconButton } from "@mui/material";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export default function RegisterPage() {
    const router = useRouter();
    const Trans = useTrans();
    const { i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [pendingEmail, setPendingEmail] = useState("");
    const [devOtp, setDevOtp] = useState<string | null>(null);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLanguageToggle = () => {
        const newLang = i18n.language === 'vi' ? 'en' : 'vi';
        i18n.changeLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    const {
        setLoadingAuth,
        setErrorAuth,
        setAuthData } = useAuthStore();

    const loadingAuth = useAuthStore((s) => s.loadingAuth);
    const errorAuth = useAuthStore((s) => s.errorAuth);

    const mapErrorMessage = (msg: string | undefined): string => {
        if (!msg) return Trans("COMMON.ERROR");
        if (msg.includes("Email already in use") || msg.includes("Email đã được sử dụng")) return Trans("REGIS.EMAIL_IN_USE");
        if (msg.includes("Username already taken") || msg.includes("Tên đăng nhập đã được sử dụng")) return Trans("REGIS.USERNAME_TAKEN");
        return msg;
    };

    const formik = useFormik({
        initialValues,
        validationSchema: validationSchemaRegisForm(Trans),
        onSubmit: async (values) => {
            setErrorAuth(null);
            setLoadingAuth(true);
            try {
                const { confirmPsw, ...registerData } = values;
                const result = await authService.registerSendOtp({
                    email: registerData.email.trim(),
                    password: registerData.password,
                    displayName: registerData.displayName.trim(),
                    username: registerData.username?.trim() || undefined,
                    phone: registerData.phone?.trim() || undefined,
                });

                if (result?.ok === false) {
                    setErrorAuth(mapErrorMessage(result?.payload?.message));
                    return;
                }

                const payload = (result as any)?.payload;
                setPendingEmail(registerData.email.trim());
                if (payload?.devOtp) {
                    setDevOtp(payload.devOtp);
                }
                setStep(2);
                toast.success("Mã OTP đã được gửi đến email của bạn");
            } catch (error: any) {
                setErrorAuth(mapErrorMessage(error?.message));
            } finally {
                setLoadingAuth(false);
            }
        },
    });

    const handleVerifyOtp = async (otp: string) => {
        setOtpError(null);
        setOtpLoading(true);
        try {
            const result = await authService.registerVerifyOtp({
                email: pendingEmail,
                otp: otp.trim(),
            });

            if (result?.ok === false || !(result as any)?.payload?.accessToken) {
                setOtpError((result as any)?.payload?.message || "Mã xác thực không chính xác");
                return;
            }

            const payload = (result as any)?.payload;
            if (typeof window !== "undefined" && payload.accessToken && payload.refreshToken) {
                localStorage.setItem("accessToken", payload.accessToken);
                localStorage.setItem("refreshToken", payload.refreshToken);
                localStorage.setItem("currentUserId", payload.user.id);
            }

            setAuthData({
                success: true,
                data: {
                    accessToken: payload.accessToken || "",
                    refreshToken: payload.refreshToken || "",
                    user: payload.user,
                },
                message: Trans("REGIS.REGISTER_SUCCESS"),
            });

            toast.success("Đăng ký tài khoản thành công!");
            router.push("/me");
        } catch (error: any) {
            setOtpError(error?.message || "Xác thực OTP thất bại");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setOtpError(null);
        try {
            const result = await authService.registerSendOtp({
                email: formik.values.email.trim(),
                password: formik.values.password,
                displayName: formik.values.displayName.trim(),
                username: formik.values.username?.trim() || undefined,
                phone: formik.values.phone?.trim() || undefined,
            });

            if (result?.ok === false) {
                setOtpError(result?.payload?.message || "Gửi lại OTP thất bại");
                return;
            }

            const payload = (result as any)?.payload;
            if (payload?.devOtp) {
                setDevOtp(payload.devOtp);
            }
            toast.success("Đã gửi lại mã OTP mới");
        } catch (err: any) {
            setOtpError(err?.message || "Không thể gửi lại mã OTP");
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <Page suppressHydrationWarning>
            <Content spacing={2}>
                <LogoWrap>
                    <Image
                        src="https://stc-zlogin.zdn.vn/images/zlogo.png"
                        alt="Zalo Logo"
                        width={80}
                        height={35}
                        priority
                    />
                    <IconButton onClick={handleLanguageToggle}>
                        <LanguageOutlinedIcon />
                    </IconButton>
                </LogoWrap>

                <Subtitle>
                    {Trans("REGIS.SUBTITLE")}
                </Subtitle>

                <Card>
                    <TabContainer>
                        <CardHeader>
                            <AuthHeader>
                                {step === 1 ? Trans("REGIS.HEADER") : "Xác thực OTP"}
                            </AuthHeader>
                        </CardHeader>

                        {step === 1 ? (
                            <FormRegis
                                formik={formik}
                                onGoLogin={() => router.push("/login")}
                                errorMsg={errorAuth}
                                loading={loadingAuth}
                            />
                        ) : (
                            <RegisterOtpStep
                                email={pendingEmail}
                                onVerify={handleVerifyOtp}
                                onResendOtp={handleResendOtp}
                                onBack={() => {
                                    setStep(1);
                                    setOtpError(null);
                                }}
                                loading={otpLoading}
                                errorMsg={otpError}
                                devOtp={devOtp}
                            />
                        )}
                    </TabContainer>
                </Card>
            </Content>
        </Page>
    );
}
