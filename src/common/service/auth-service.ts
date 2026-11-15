import http from "../api/http";
import { API } from "../api/path";
import {
  IApiResponse,
  IAuthResponse,
  ILoginPayload,
  IRefreshPayload,
  IRefreshResponse,
  IRegisterPayload,
  IRegisterResponse,
  IUpdateUserPayload,
  IRegisterSendOtpPayload,
  IRegisterVerifyOtpPayload,
  ILoginSendOtpPayload,
  ILoginVerifyOtpPayload,
  IForgotPasswordSendOtpPayload,
  IForgotPasswordResetPayload,
  ISendOtpResponse,
} from "../interface/auth-interface";

export const authService = {
  authRegister(body: IRegisterPayload) {
    return http.post<IRegisterResponse>(API.API_AUTH_REGISTER, body, {
      skipAuth: true,
    });
  },

  registerSendOtp(body: IRegisterSendOtpPayload) {
    return http.post<ISendOtpResponse>(API.API_AUTH_REGISTER_SEND_OTP, body, {
      skipAuth: true,
    });
  },

  registerVerifyOtp(body: IRegisterVerifyOtpPayload) {
    return http.post<IAuthResponse>(API.API_AUTH_REGISTER_VERIFY_OTP, body, {
      skipAuth: true,
    });
  },

  authLogin(body: ILoginPayload) {
    return http.post<IApiResponse<IAuthResponse>>(API.API_AUTH_LOGIN, body, {
      skipAuth: true,
    });
  },

  loginSendOtp(body: ILoginSendOtpPayload) {
    return http.post<ISendOtpResponse>(API.API_AUTH_LOGIN_SEND_OTP, body, {
      skipAuth: true,
    });
  },

  loginVerifyOtp(body: ILoginVerifyOtpPayload) {
    return http.post<IAuthResponse>(API.API_AUTH_LOGIN_VERIFY_OTP, body, {
      skipAuth: true,
    });
  },

  forgotPasswordSendOtp(body: IForgotPasswordSendOtpPayload) {
    return http.post<ISendOtpResponse>(API.API_AUTH_FORGOT_PASSWORD_SEND_OTP, body, {
      skipAuth: true,
    });
  },

  forgotPasswordReset(body: IForgotPasswordResetPayload) {
    return http.post<{ success: boolean; message: string }>(API.API_AUTH_FORGOT_PASSWORD_RESET, body, {
      skipAuth: true,
    });
  },

  authRefresh(body: IRefreshPayload) {
    return http.post<IApiResponse<IRefreshResponse>>(API.API_AUTH_REFRESH, body, {
      skipAuth: true,
    });
  },

  authLogout() {
    return http.post(API.API_AUTH_LOGOUT);
  },

  updateUserProfile(body: IUpdateUserPayload) {
    return http.put<IApiResponse<any>>(API.API_USERS_ME, body);
  },

  changePassword(oldPassword: string, newPassword: string) {
    return http.post<IApiResponse<any>>(API.API_AUTH_CHANGE_PASSWORD, { oldPassword, newPassword });
  },
};
