// src/app/sessions/[sessionId]/behavior/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSessionRoster } from "@/hooks/useSessionRoster";
import { BehaviorRecordsPage } from "@/components/features/behavior-records/BehaviorRecordsPage";

// Registro rápido de comportamento (US11): aluno -> tag
export default function SessionBehaviorPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);
  const { roster, isLoading, error } = useSessionRoster(sessionId);

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col font-sans">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
        >
          <ArrowLeft size={22} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-center">Registro de Comportamento</h1>
        {isLoading ? (
          <p className="text-sm text-gray-500 text-center animate-pulse">Carregando alunos...</p>
        ) : error || !roster ? (
          <p role="alert" className="text-sm text-red-600 text-center">
            {error ?? "Não foi possível carregar os alunos da sessão."}
          </p>
        ) : (
          <BehaviorRecordsPage
            sessionId={sessionId}
            students={roster.students.map((s) => ({ id: s.id, name: s.name }))}
          />
        )}
      </main>
    </div>
  );
}
