// src/app/student-rooms/[id]/problems/[problemId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface StudentSessionItem {
  id: string;
  dateLabel: string;
  statusLabel: string;
  variant: "today" | "past" | "older";
}

const STUDENT_SESSIONS: StudentSessionItem[] = [
  {
    id: "session_hoje",
    dateLabel: "Hoje",
    statusLabel: "Avaliação por pares disponivel",
    variant: "today",
  },
  {
    id: "session_01",
    dateLabel: "08/04",
    statusLabel: "Sessão Finalizada",
    variant: "past",
  },
  {
    id: "session_02",
    dateLabel: "03/04",
    statusLabel: "Sessão Finalizada",
    variant: "older",
  },
];

export default function StudentProblemSessionsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "1";
  const problemId =
    typeof params?.problemId === "string" ? params.problemId : "prob_01";

  const problemTitle = problemId === "prob_02" ? "Problema 2" : "Problema 1";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F7] font-sans flex flex-col">
      {/* Header superior */}
      <header className="w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between max-w-md mx-auto">
        <button
          type="button"
          onClick={() => router.push(`/student-rooms/${roomId}`)}
          aria-label="Voltar para problemas da sala"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/60 active:scale-95 transition-all text-gray-900 cursor-pointer"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="bg-[#BAC2E6] text-[#2E3A70] text-xs font-bold px-8 py-1.5 rounded-full tracking-wide select-none border border-[#96A2D8]">
          EXA613 - 2026.2
        </div>

        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Conteúdo central */}
      <div className="flex-1 w-full max-w-md mx-auto px-5 py-4 flex flex-col gap-6">
        {/* Card do Problema */}
        <section className="w-full bg-white rounded-[2rem] border border-gray-200 p-6 shadow-xs">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight pb-3 border-b border-gray-200">
            {problemTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-3">
            Engenharia de Software
          </p>
        </section>

        {/* Sessões realizadas */}
        <section className="w-full flex flex-col gap-4 mt-2">
          <h2 className="text-2xl font-bold text-center text-gray-900 tracking-tight">
            Sessões realizadas
          </h2>

          <div className="flex flex-col gap-4">
            {STUDENT_SESSIONS.map((session) => {
              const bgClass =
                session.variant === "today"
                  ? "bg-[#384486] hover:bg-[#313B75] border-[#5B68AC]"
                  : session.variant === "past"
                  ? "bg-[#19235A] hover:bg-[#131B47] border-[#394584]"
                  : "bg-[#0B1238] hover:bg-[#080D2B] border-[#2C376E]";

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/student-rooms/${roomId}/problems/${problemId}/sessions/${session.id}`
                    )
                  }
                  className={`w-full rounded-[2rem] p-5 text-white shadow-md transition-all active:scale-[0.98] cursor-pointer border-2 ${bgClass}`}
                >
                  <div className="text-3xl font-bold pb-2.5 mb-2.5 border-b border-white/25 text-center">
                    {session.dateLabel}
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-white/95 text-center">
                    {session.statusLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
