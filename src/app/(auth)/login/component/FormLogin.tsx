"use client";

import React, { useState } from "react";
import { TabContext, TabPanel } from "@mui/lab";
import { FormikLike } from "@/src/common/interface/formik-interface";
import { useTrans } from "@/src/common/utilities/hook/trans";
import {
  TabContainer,
  CardHeader,
  Tabs,
  TabItem,
} from "../../Auth.styles";
import LoginPasswordTab, { LoginFormValues } from "./LogginPswTab";
import LoginOtpTab from "./LoginOtpTab";
import ForgotPasswordModal from "./ForgotPasswordModal";

export interface FormLoginProps {
  formik: FormikLike<LoginFormValues>;
  loading?: boolean;
  errorMsg?: string | null;
  onGoRegister: () => void;
}

export default function FormLogin(props: FormLoginProps) {
  const { formik, loading, errorMsg, onGoRegister } = props;
  const Trans = useTrans();
  const [tab, setTab] = useState<string>("password");
  const [showForgot, setShowForgot] = useState(false);

  return (
    <>
      <TabContext value={tab}>
        <TabContainer>
          <CardHeader>
            <Tabs
              onChange={(_, v: string) => setTab(v)}
              centered
            >
              <TabItem label={Trans("LOGIN.PASSWORD_TAB")} value="password" />
              <TabItem label={Trans("LOGIN.OTP_TAB")} value="otp" />
            </Tabs>
          </CardHeader>

          <TabPanel value="password" sx={{ p: 0 }}>
            <LoginPasswordTab
              formik={formik}
              loading={loading}
              errorMsg={errorMsg}
              onGoRegister={onGoRegister}
              onForgotPassword={() => setShowForgot(true)}
            />
          </TabPanel>

          <TabPanel value="otp" sx={{ p: 0 }}>
            <LoginOtpTab onGoRegister={onGoRegister} />
          </TabPanel>
        </TabContainer>
      </TabContext>

      <ForgotPasswordModal
        open={showForgot}
        onClose={() => setShowForgot(false)}
      />
    </>
  );
}
