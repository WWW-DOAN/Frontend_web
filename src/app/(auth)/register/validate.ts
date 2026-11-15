import { Gender } from "@/src/common/interface/auth-interface";
import * as yup from "yup";

export const initialValues = {
    username: "",
    password: "",
    email: "",
    displayName: "",
    dateOfBirth: "",
    gender: "male" as Gender,
    confirmPsw: "",
    phone: "",
};

export const validationSchemaRegisForm = (Trans: (key: string) => string) =>
    yup.object({
        username: yup
            .string()
            .trim()
            .test("min-len", Trans("REGIS.USERNAME_MIN") || "Username phải có ít nhất 3 ký tự", (val) => !val || val.length >= 3)
            .optional(),

        email: yup
            .string()
            .trim()
            .email(Trans("REGIS.EMAIL_INVALID") || "Email không hợp lệ")
            .required(Trans("REGIS.EMAIL_REQUIRED") || "Email là bắt buộc"),
        
        password: yup
            .string()
            .min(6, Trans("REGIS.PASSWORD_MIN") || "Mật khẩu phải có ít nhất 6 ký tự")
            .required(Trans("REGIS.PASSWORD_REQUIRED") || "Mật khẩu là bắt buộc"),

        displayName: yup
            .string()
            .trim()
            .required(Trans("REGIS.DISPLAYNAME_REQUIRED") || "Tên hiển thị là bắt buộc"),

        dateOfBirth: yup
            .string()
            .optional(),

        gender: yup
            .mixed<Gender>()
            .oneOf(["male", "female", "other"])
            .optional(),

        phone: yup
            .string()
            .trim()
            .optional(),

        confirmPsw: yup
            .string()
            .oneOf([yup.ref("password")], "Mật khẩu xác nhận không khớp")
            .required("Vui lòng xác nhận mật khẩu"),
    });