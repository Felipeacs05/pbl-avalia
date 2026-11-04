// src/components/features/password-recovery/ResetPasswordForm.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LoginButton } from "@/components/ui/LoginButton";

interface ResetPasswordFormProps {
  token: string; // vem do link enviado por e-mail
  successMessage: string | null;
  error: string | null;
  isSubmitting?: boolean;
  onSubmit: (token: string, newPassword: string) => Promise<void>;
}

// Redefine a senha com o token do link. Depois do sucesso o token não vale mais:
// some o formulário e fica só o caminho para o login (as sessões antigas foram encerradas).
export function ResetPasswordForm({ token, successMessage, error, isSubmitting = false, onSubmit }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatchError, setMismatchError] = useState<string | null>(null);

  // A confirmação é só do front: o back-end continua recebendo apenas o newPassword
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatchError("As senhas não coincidem.");
      return;
    }
    setMismatchError(null);
    void onSubmit(token, newPassword);
  }

  const shownError = mismatchError ?? error;

  if (successMessage) {
    return (
      <div className="space-y-4 w-full max-w-sm text-center">
        <div role="status" className="p-3 text-sm text-green-800 bg-green-50 rounded-lg border border-green-200">
          {successMessage}
        </div>
        <Link href="/" className="inline-block text-sm font-semibold text-[#182860] hover:text-[#757DC3] hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {shownError && (
        <div role="alert" className="p-3 text-xs text-red-600 bg-red-100 rounded-lg border border-red-200">
          {shownError}
        </div>
      )}

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="••••••••"
          disabled={isSubmitting}
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] text-black placeholder-gray-500 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="••••••••"
          disabled={isSubmitting}
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] text-black placeholder-gray-500 disabled:opacity-60"
        />
      </div>

      <LoginButton text={isSubmitting ? "Redefinindo..." : "Redefinir senha"} type="submit" disabled={isSubmitting} />
    </form>
  );
}
