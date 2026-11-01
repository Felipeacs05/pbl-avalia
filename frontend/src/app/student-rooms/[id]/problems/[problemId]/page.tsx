// src/app/student-rooms/[id]/problems/[problemId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProblemDetailsHeader } from "../../../../../components/features/problem-details/ProblemDetailsHeader";
import { BarChart3, UserCheck, Users } from "lucide-react";

interface StudentSessionItem {
  id: string;
  dateLabel: string;
  statusLabel: string;
  gradient: string;
}

const STUDENT_SESSIONS: StudentSessionItem[] = [
  {
    id: "session_hoje",
    dateLabel: "Hoje",
    statusLabel: "Avaliação por pares disponivel",
    gradient: "from-[#3B4899] to-[#4354A0]",
  },
  {
    id: "session_01",
    dateLabel: "08/04",
    statusLabel: "Sessão Finalizada",
    gradient: "from-[#2D3A7C] to-[#4354A0]",
  },
  {
    id: "session_02",
    dateLabel: "03/04",
    statusLabel: "Sessão Finalizada",
    gradient: "from-[#1E285E] to-[#34438E]",
  },
];

export default function StudentProblemSessionsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "1";
  const problemId =
    typeof params?.problemId === "string" ? params.problemId : "prob_01";

  const problemTitle = problemId === "prob_02" ? "Problema 2" : "Problema 1";
  const problemSubtitle =
    problemId === "prob_02"
      ? "Confecção do MVP — Engenharia de Software"
      : "Prototipação do projeto e do PRD — Engenharia de Software";

  const handleOpenSession = (sessionId: string) => {
    router.push(
      `/student-rooms/${roomId}/problems/${problemId}/sessions/${sessionId}`
    );
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      {/* Header responsivo igual ao professor */}
      <ProblemDetailsHeader
        disciplineTag="EXA613 - 2026.2"
        onBack={() => router.push(`/student-rooms/${roomId}`)}
        onShare={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
      />

      {/* ===== MOBILE LAYOUT (< md — proporção 9:16) ===== */}
      <div className="flex-1 flex flex-col md:hidden">
        <div className="flex-1 px-5 pt-6 pb-8 overflow-y-auto space-y-6">
          {/* Card do Problema */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              {problemTitle}
            </h1>
            <div className="w-full h-px bg-gray-200 mb-3" />
            <p className="text-sm text-gray-500 leading-relaxed">
              {problemSubtitle}
            </p>
          </div>

          {/* Sessões realizadas */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Sessões realizadas
            </h2>

            {STUDENT_SESSIONS.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => handleOpenSession(session.id)}
                className={`w-full text-left relative bg-gradient-to-br ${session.gradient} text-white rounded-2xl p-5 shadow-md overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer group`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-white/10 transition-colors" />
                <p className="text-4xl font-bold tracking-tight text-center mb-3 drop-shadow-sm">
                  {session.dateLabel}
                </p>
                <div className="w-full h-px bg-white/20 mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/85 font-medium leading-snug flex-1 mr-2">
                    {session.statusLabel}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                    <BarChart3 size={18} className="text-white/75" aria-hidden="true" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (>= md — 2 colunas igual ao professor) ===== */}
      <div className="hidden md:flex flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-8 gap-8">
        {/* Coluna Esquerda: Card do Problema + Atalhos de Avaliação */}
        <div className="w-1/2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              {problemTitle}
            </h1>
            <div className="w-full h-px bg-gray-200 mb-3" />
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              {problemSubtitle}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/selfevaluation")}
                className="w-full bg-[#757DC3] hover:bg-[#636BAE] active:scale-[0.98] text-white py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck size={17} />
                <span>Autoavaliação</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/peerevaluation")}
                className="w-full bg-[#4354A0] hover:bg-[#364485] active:scale-[0.98] text-white py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users size={17} />
                <span>Avaliação por pares</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Sessões realizadas */}
        <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-8rem)] space-y-4">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Sessões realizadas
          </h2>

          {STUDENT_SESSIONS.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => handleOpenSession(session.id)}
              className={`w-full text-left relative bg-gradient-to-br ${session.gradient} text-white rounded-2xl p-5 shadow-md overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer group`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-white/10 transition-colors" />
              <p className="text-4xl font-bold tracking-tight text-center mb-3 drop-shadow-sm">
                {session.dateLabel}
              </p>
              <div className="w-full h-px bg-white/20 mb-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/85 font-medium leading-snug flex-1 mr-2">
                  {session.statusLabel}
                </span>
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                  <BarChart3 size={18} className="text-white/75" aria-hidden="true" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
