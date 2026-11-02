// src/app/reset-password/page.tsx
"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordPanel } from "@/components/features/password-recovery/ResetPasswordPanel";

// O token chega no link do e-mail: /reset-password?token=...
function ResetPasswordContent() {
  const token = useSearchParams().get("token") ?? "";
  return <ResetPasswordPanel token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Redefinir Senha</h1>
        {/* useSearchParams precisa de Suspense para a página ser gerada no build */}
        <Suspense fallback={<p className="text-sm text-gray-400">Carregando...</p>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  );
}
