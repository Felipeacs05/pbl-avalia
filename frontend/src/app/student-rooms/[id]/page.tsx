// src/app/student-rooms/[id]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProblemDetailsHeader } from "../../../components/features/problem-details/ProblemDetailsHeader";
import { ChevronRight, LogOut } from "lucide-react";
import { useStudentsRoom } from "../../../hooks/useStudentsRoom";
import { useProblems } from "../../../hooks/useProblems";
import { USE_REAL_API } from "../../../services/apiMode";

interface StudentProblemItem {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
}

const GRADIENTS = [
  "from-[#3B4899] to-[#4354A0]",
  "from-[#25316D] to-[#34438E]",
];

const STUDENT_PROBLEMS: StudentProblemItem[] = [
  {
    id: "prob_01",
    title: "Problema 1",
    subtitle: "Prototipação do projeto e do PRD",
    gradient: GRADIENTS[0],
  },
  {
    id: "prob_02",
    title: "Problema 2",
    subtitle: "Confecção do MVP",
    gradient: GRADIENTS[1],
  },
];

export default function StudentRoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "1";

  const { rooms, leaveRoom } = useStudentsRoom();
  const { problems: apiProblems, isLoading: isLoadingProblems } = useProblems(roomId);

  const currentRoom = rooms.find((r) => r.id === roomId);

  const disciplineTag = currentRoom
    ? `${currentRoom.code} - ${currentRoom.semester ?? "2026.2"}`
    : USE_REAL_API
      ? "Sala Tutorial"
      : "EXA613 - 2026.2";

  const roomTitle = currentRoom?.name ?? (USE_REAL_API ? "Sala Tutorial PBL" : "Engenharia De Software");
  const roomDescription = currentRoom?.tutor
    ? `Tutor(a) responsável: ${currentRoom.tutor}`
    : USE_REAL_API
      ? "Ambiente de Aprendizagem Baseada em Problemas (PBL)"
      : "Criação e prototipação de um software em nível de equipe;";

  const problemsToDisplay: StudentProblemItem[] = USE_REAL_API
    ? apiProblems.map((p, idx) => ({
        id: p.id,
        title: p.title,
        subtitle:
          (p as { description?: string }).description ||
          "Visualizar sessões e avaliações do problema",
        gradient: GRADIENTS[idx % GRADIENTS.length],
      }))
    : STUDENT_PROBLEMS;

  const handleOpenProblem = (problemId: string) => {
    router.push(`/student-rooms/${roomId}/problems/${problemId}`);
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom(roomId);
    } catch (error) {
      console.error("Erro ao sair da sala:", error);
    } finally {
      router.push("/student-rooms");
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      {/* Header responsivo igual ao fluxo do professor */}
      <ProblemDetailsHeader
        disciplineTag={disciplineTag}
        onBack={() => router.push("/student-rooms")}
        onShare={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
      />

      {/* ===== MOBILE LAYOUT (< md — proporção 9:16) ===== */}
      <div className="flex-1 flex flex-col justify-between md:hidden">
        <div className="flex-1 px-5 pt-6 pb-6 overflow-y-auto space-y-6">
          {/* Card da Disciplina */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              {roomTitle}
            </h1>
            <div className="w-full h-px bg-gray-200 mb-3" />
            <p className="text-sm text-gray-500 leading-relaxed">
              {roomDescription}
            </p>
          </div>

          {/* Lista de Problemas */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Problemas
            </h2>

            {USE_REAL_API && isLoadingProblems ? (
              <p className="text-sm text-gray-400">Carregando problemas...</p>
            ) : problemsToDisplay.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum problema cadastrado nesta sala até o momento.
              </p>
            ) : (
              problemsToDisplay.map((problem) => (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => handleOpenProblem(problem.id)}
                  className={`w-full text-left relative bg-gradient-to-br ${problem.gradient} text-white rounded-2xl p-5 shadow-md overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer group`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-white/10 transition-colors" />
                  <p className="text-2xl font-bold tracking-tight text-center mb-3 drop-shadow-sm">
                    {problem.title}
                  </p>
                  <div className="w-full h-px bg-white/20 mb-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/90 font-medium leading-snug flex-1 mr-2">
                      {problem.subtitle}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                      <ChevronRight size={18} className="text-white/80" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer fixo no mobile */}
        <div className="sticky bottom-0 bg-[#F5F5F5] border-t border-gray-200/60 px-5 py-4">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="w-full bg-[#FF2957] hover:bg-[#E01E48] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={17} />
            <span>Sair da Sala</span>
          </button>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (>= md — 2 colunas igual ao professor) ===== */}
      <div className="hidden md:flex flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-8 gap-8">
        {/* Coluna Esquerda: Detalhes da Disciplina + Sair da Sala */}
        <div className="w-1/2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              {roomTitle}
            </h1>
            <div className="w-full h-px bg-gray-200 mb-3" />
            <p className="text-sm text-gray-500 leading-relaxed">
              {roomDescription}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLeaveRoom}
            className="w-full bg-[#FF2957] hover:bg-[#E01E48] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={17} />
            <span>Sair da Sala</span>
          </button>
        </div>

        {/* Coluna Direita: Problemas */}
        <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-8rem)] space-y-4">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Problemas
          </h2>

          {USE_REAL_API && isLoadingProblems ? (
            <p className="text-sm text-gray-400">Carregando problemas...</p>
          ) : problemsToDisplay.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum problema cadastrado nesta sala até o momento.
            </p>
          ) : (
            problemsToDisplay.map((problem) => (
              <button
                key={problem.id}
                type="button"
                onClick={() => handleOpenProblem(problem.id)}
                className={`w-full text-left relative bg-gradient-to-br ${problem.gradient} text-white rounded-2xl p-5 shadow-md overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer group`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-white/10 transition-colors" />
                <p className="text-3xl font-bold tracking-tight text-center mb-3 drop-shadow-sm">
                  {problem.title}
                </p>
                <div className="w-full h-px bg-white/20 mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90 font-medium leading-snug flex-1 mr-2">
                    {problem.subtitle}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                    <ChevronRight size={18} className="text-white/80" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
