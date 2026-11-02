// src/components/features/password-recovery/ResetPasswordPanel.tsx
"use client";

import React from "react";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordPanel({ token }: { token: string }) {
  const { resetPassword, isSubmitting, successMessage, error } = usePasswordRecovery();
  return (
    <ResetPasswordForm
      token={token}
      successMessage={successMessage}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={resetPassword}
    />
  );
}
