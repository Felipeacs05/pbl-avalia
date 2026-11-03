// src/components/features/password-recovery/ForgotPasswordPanel.tsx
"use client";

import React from "react";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function ForgotPasswordPanel() {
  const { requestRecovery, isSubmitting, successMessage, error } = usePasswordRecovery();
  return (
    <ForgotPasswordForm
      successMessage={successMessage}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={requestRecovery}
    />
  );
}
