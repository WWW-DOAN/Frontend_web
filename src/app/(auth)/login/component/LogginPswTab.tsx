"use client";

import * as React from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import HttpsRoundedIcon from "@mui/icons-material/HttpsRounded";
import {
    AuthTextField,
    GridIcon,
    GridPswFrm,
    HelperTextAuth,
    LoginButton,
    ToRegisPage,
} from "../../Auth.styles";
import { FormikLike } from "@/src/common/interface/formik-interface";

import { styled } from "@mui/material/styles";
import { useTrans } from "@/src/common/utilities/hook/trans";
const PasswordFormStyled = styled(Stack)({
    gap: 16,
    padding: "16px 72px",
});

export interface LoginFormValues {
    email: string;
    password: string;
}

export interface LoginPasswordTabProps {
    formik: FormikLike<LoginFormValues>;
    loading?: boolean;
    errorMsg?: string | null;
    onGoRegister: () => void;
    onForgotPassword?: () => void;
}

export default function LoginPasswordTab(props: LoginPasswordTabProps) {
    const { formik, loading, errorMsg, onGoRegister, onForgotPassword } = props;
    const Trans = useTrans();

    return (
        <form autoComplete="off" onSubmit={formik.handleSubmit}>
            <PasswordFormStyled>
                    {/* EMAIL */}
                    <Box>
                        <GridPswFrm container size={12}>
                            <GridIcon size={1}>
                                <EmailRoundedIcon color="action" sx={{ fontSize: 14 }} />
                            </GridIcon>

                            <Grid size={11}>
                                <AuthTextField
                                    name="email"
                                    value={formik.values.email ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder={Trans("LOGIN.EMAIL_PLACEHOLDER")}
                                    type="email"
                                    fullWidth
                                    autoComplete="email"
                                    error={Boolean(formik.touched.email && formik.errors.email)}
                                />
                            </Grid>
                        </GridPswFrm>
                        {formik.touched.email && formik.errors.email && (
                            <Grid size={12}>
                                <HelperTextAuth >
                                    {formik.errors.email as string}
                                </HelperTextAuth>
                            </Grid>
                        )}
                    </Box>
                    {/* PASSWORD */}
                    <Box>
                        <GridPswFrm container size={12}>
                            <GridIcon size={1}>
                                <HttpsRoundedIcon color="action" sx={{ fontSize: 14 }} />
                            </GridIcon>

                            <Grid size={11}>
                                <AuthTextField
                                    name="password"
                                    value={formik.values.password ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder={Trans("LOGIN.PASSWORD_PLACEHOLDER")}
                                    type="password"
                                    fullWidth
                                    autoComplete="new-password"
                                    error={Boolean(formik.touched.password && formik.errors.password)}
                                />
                            </Grid>
                        </GridPswFrm>
                        {formik.touched.password && formik.errors.password && (
                            <Grid size={12}>
                                <HelperTextAuth >
                                    {formik.errors.password as string}
                                </HelperTextAuth>
                            </Grid>
                        )}
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -0.5 }}>
                        <Typography
                            variant="body2"
                            onClick={onForgotPassword}
                            sx={{
                                color: "#0068FF",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 500,
                                "&:hover": { textDecoration: "underline" },
                            }}
                        >
                            {Trans("LOGIN.FORGOT_PASSWORD")}
                        </Typography>
                    </Box>
                    {errorMsg ? (
                        <Typography color="error" fontSize={13}>
                            {errorMsg}
                        </Typography>
                    ) : null}

                    <LoginButton
                        type="submit"
                        disabled={Boolean(loading)}
                        fullWidth
                        sx={{ mt: 2, mb: 1 }}
                    >
                        {loading ? Trans("LOGIN.LOADING") : Trans("LOGIN.SUBMIT")}
                    </LoginButton>

                    <ToRegisPage
                        onClick={onGoRegister}
                        variant="body2"
                        color="text.secondary"
                    >
                        {Trans("LOGIN.NO_ACCOUNT")}
                    </ToRegisPage>
                </PasswordFormStyled>
        </form>
    );
}
