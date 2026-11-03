// src/components/features/password-recovery/ForgotPasswordForm.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LoginButton } from "@/components/ui/LoginButton";

interface ForgotPasswordFormProps {
  successMessage: string | null;
  error?: string | null;
  isSubmitting?: boolean;
  onSubmit: (email: string) => Promise<void>;
}

// Pede o link de redefinição. A confirmação é a do backend, igual para e-mail cadastrado ou não.
export function ForgotPasswordForm({ successMessage, error = null, isSubmitting = false, onSubmit }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onSubmit(email.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <p className="text-sm text-gray-600">
        Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para redefinir a senha.
      </p>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-600 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div role="status" className="p-3 text-xs text-green-800 bg-green-50 rounded-lg border border-green-200">
          {successMessage}
        </div>
      )}

      <div>
        <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input
          id="recovery-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@email.com"
          disabled={isSubmitting}
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] text-black placeholder-gray-500 disabled:opacity-60"
        />
      </div>

      <LoginButton text={isSubmitting ? "Enviando..." : "Enviar link"} type="submit" disabled={isSubmitting} />

      <div className="text-center pt-2">
        <Link href="/" className="text-sm font-semibold text-[#182860] hover:text-[#757DC3] hover:underline">
          Voltar para o login
        </Link>
      </div>
    </form>
  );
}
