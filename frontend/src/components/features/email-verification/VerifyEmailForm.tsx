// src/components/features/email-verification/VerifyEmailForm.tsx
"use client";

import React, { useState } from "react";
import { LoginButton } from "@/components/ui/LoginButton";

interface VerifyEmailFormProps {
  email: string;
  isSubmitting?: boolean;
  successMessage?: string | null;
  error?: string | null;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}

export function VerifyEmailForm({
  email,
  isSubmitting = false,
  successMessage = null,
  error = null,
  onVerify,
  onResend,
}: VerifyEmailFormProps) {
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (isSubmitting || !trimmedCode) return;
    void onVerify(trimmedCode);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <p className="text-sm text-gray-600 text-center">
        Enviamos um código de verificação para <strong className="text-gray-800">{email}</strong>.
        Digite-o abaixo para confirmar sua conta.
      </p>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-600 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {successMessage && (
        <div role="status" className="p-3 text-sm text-green-800 bg-green-50 rounded-lg border border-green-200">
          {successMessage}
        </div>
      )}

      <div>
        <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">Código de verificação</label>
        <input
          id="verification-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          disabled={isSubmitting}
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] text-black text-center tracking-widest placeholder-gray-400 disabled:opacity-60"
        />
      </div>

      <LoginButton text="Verificar" type="submit" disabled={isSubmitting} />

      <button
        type="button"
        onClick={() => void onResend()}
        disabled={isSubmitting}
        className="w-full text-sm font-semibold text-[#182860] hover:text-[#757DC3] hover:underline disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
      >
        Reenviar e-mail
      </button>
    </form>
  );
}
