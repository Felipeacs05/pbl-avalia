// src/app/verify-email/page.tsx
"use client";

import React from "react";
import { VerifyEmailPanel } from "@/components/features/email-verification/VerifyEmailPanel";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Verificar e-mail</h1>
        <VerifyEmailPanel />
      </div>
    </main>
  );
}
