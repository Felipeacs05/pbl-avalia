// src/components/features/profile/ChangePasswordForm.tsx
"use client";

import React, { useState } from "react";
import { LoginButton } from "@/components/ui/LoginButton";

interface ChangePasswordFormProps {
  isSubmitting?: boolean;
  successMessage: string | null;
  error: string | null;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
}

const inputClassName =
  "w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] text-black placeholder-gray-500 disabled:opacity-60";

// A troca exige a senha atual (confirmação da senha anterior, pela US)
export function ChangePasswordForm({ isSubmitting = false, successMessage, error, onSubmit }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || !currentPassword || !newPassword) return;
    void onSubmit(currentPassword, newPassword);
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Alterar senha" className="space-y-4 w-full">
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
        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isSubmitting}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isSubmitting}
          className={inputClassName}
        />
      </div>

      <LoginButton text="Alterar senha" type="submit" disabled={isSubmitting} />
    </form>
  );
}
