export type Gender = "male" | "female" | "other";

export interface IUser {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    displayName: string;
    fullName?: string;
    avatarUrl?: string | null;
    bio?: string | null;
    gender?: string;
    dateOfBirth?: Date;
    phone?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRegisterPayload {
    username: string;
    email: string;
    password: string;
    displayName: string;
    gender?: string;
    dateOfBirth?: Date;
    phone?: string;
}

export interface ISendOtpResponse {
    success: boolean;
    message: string;
    email: string;
    cooldown: number;
    expiresIn: number;
    devOtp?: string;
}

export interface IRegisterSendOtpPayload {
    email: string;
    password: string;
    displayName: string;
    username?: string;
    phone?: string;
}

export interface IRegisterVerifyOtpPayload {
    email: string;
    otp: string;
}

export interface ILoginSendOtpPayload {
    email: string;
}

export interface ILoginVerifyOtpPayload {
    email: string;
    otp: string;
}

export interface IForgotPasswordSendOtpPayload {
    email: string;
}

export interface IForgotPasswordResetPayload {
    email: string;
    otp: string;
    newPassword: string;
}

export interface ILoginPayload {
    email: string;
    password: string;
}

export interface IAuthResponse {
    accessToken: string;
    refreshToken: string;
    user: IUser;
    tokens?: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}

export interface IRefreshPayload {
    refreshToken: string;
}

export interface IRefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
}

export interface IUpdateUserPayload {
    displayName?: string;
    bio?: string;
    avatarUrl?: string | null;
    dateOfBirth?: Date;
    gender?: string;
    email?: string;
}

export interface IApiResponse<T, M = unknown> {
    success?: boolean;
    data?: T;
    meta?: M;
    message?: string;
    timestamp?: string;
}

export interface IRegisterResponse {
    accessToken?: string;
    refreshToken?: string;
    user: IUser;
    message?: string;
}
