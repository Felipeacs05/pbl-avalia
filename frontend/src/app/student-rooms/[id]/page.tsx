// src/app/student-rooms/[id]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface StudentProblemItem {
  id: string;
  title: string;
  subtitle: string;
  variant: "light" | "dark";
}

const STUDENT_PROBLEMS: StudentProblemItem[] = [
  {
    id: "prob_01",
    title: "Problema 1",
    subtitle: "Prototipação do projeto e do PRD",
    variant: "light",
  },
  {
    id: "prob_02",
    title: "Problema 2",
    subtitle: "Confecção do MVP",
    variant: "dark",
  },
];

export default function StudentRoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "1";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F7] font-sans flex flex-col justify-between">
      {/* Header superior */}
      <header className="w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between max-w-md mx-auto">
        <button
          type="button"
          onClick={() => router.push("/student-rooms")}
          aria-label="Voltar para salas do aluno"
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
        {/* Card da Disciplina */}
        <section className="w-full bg-white rounded-[2rem] border border-gray-200 p-6 shadow-xs">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight pb-3 border-b border-gray-200">
            Engenharia De Software
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 leading-relaxed">
            Criação e prototipação de um software em nível de equipe;
          </p>
        </section>

        {/* Lista de Problemas */}
        <section className="w-full flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 tracking-tight">
            Problemas
          </h2>

          <div className="flex flex-col gap-4">
            {STUDENT_PROBLEMS.map((problem) => {
              const isLight = problem.variant === "light";
              return (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() =>
                    router.push(`/student-rooms/${roomId}/problems/${problem.id}`)
                  }
                  className={`w-full rounded-[2rem] p-5 text-white shadow-md transition-all active:scale-[0.98] cursor-pointer border-2 ${
                    isLight
                      ? "bg-[#384486] hover:bg-[#313B75] border-[#5B68AC]"
                      : "bg-[#19235A] hover:bg-[#131B47] border-[#394584]"
                  }`}
                >
                  <div className="text-2xl font-bold pb-2.5 mb-2.5 border-b border-white/25 text-center">
                    {problem.title}
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-white/95 text-center">
                    {problem.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Botão Inferior "Sair da Sala" */}
      <footer className="w-full max-w-md mx-auto px-5 pb-8 pt-4">
        <button
          type="button"
          onClick={() => router.push("/student-rooms")}
          className="w-full bg-[#FF2957] hover:bg-[#E01E48] active:scale-[0.99] text-white py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base shadow-md transition-all cursor-pointer"
        >
          Sair da Sala
        </button>
      </footer>
    </main>
  );
}
