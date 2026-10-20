// src/app/sessions/[sessionId]/roles/page.tsx

"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSessionRoster } from "@/hooks/useSessionRoster";
import { SessionRolesPanel } from "@/components/features/session-roles/SessionRolesPanel";
import { toSessionRoleStudent } from "@/components/features/session-roles/sessionRoleOptions";

export default function SessionRolesPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);
  const { roster, dateLabel, isLoading, error } = useSessionRoster(sessionId);

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col font-sans">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Papéis da sessão</h1>
          {dateLabel && <p className="text-xs text-gray-500">Dia {dateLabel}</p>}
        </div>
      </header>

      <main className="flex-1 w-full max-w-md md:max-w-2xl mx-auto px-4 py-5">
        {isLoading ? (
          <p className="py-20 text-center text-sm text-gray-500 animate-pulse">Carregando alunos da sessão...</p>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : roster ? (
          <SessionRolesPanel
            key={roster.id}
            sessionId={roster.id}
            students={roster.students.map(toSessionRoleStudent)}
          />
        ) : null}
      </main>
    </div>
  );
}
