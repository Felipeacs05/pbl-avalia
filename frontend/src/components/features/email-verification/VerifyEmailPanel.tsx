// src/components/features/email-verification/VerifyEmailPanel.tsx
"use client";

import React, { useState } from "react";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { getLoggedUserProfile } from "@/services/authFetch";
import { VerifyEmailForm } from "./VerifyEmailForm";

// Quem chega aqui já está logado (o interceptor do 403 manda o usuário pendente para esta tela)
export function VerifyEmailPanel() {
  const [email] = useState(() => getLoggedUserProfile()?.email ?? "");
  const { verifyEmail, resendVerification, isSubmitting, successMessage, error } = useEmailVerification();

  return (
    <VerifyEmailForm
      email={email}
      isSubmitting={isSubmitting}
      successMessage={successMessage}
      error={error}
      onVerify={(code) => verifyEmail(email, code)}
      onResend={() => resendVerification(email)}
    />
  );
}
