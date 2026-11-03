// src/app/forgot-password/page.tsx
import React from "react";
import { ForgotPasswordPanel } from "@/components/features/password-recovery/ForgotPasswordPanel";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Recuperar Senha</h1>
        <ForgotPasswordPanel />
      </div>
    </main>
  );
}
