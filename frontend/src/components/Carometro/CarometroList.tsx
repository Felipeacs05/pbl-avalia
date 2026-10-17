// src/components/Carometro/CarometroList.tsx
"use client";

import React, { useState } from "react";
import { useCarometro } from "../../hooks/useCarometro";
import { StudentCard } from "./StudentCard";
import type { Student } from "../../types/student";
import { Users, AlertCircle, RefreshCw } from "lucide-react";

interface CarometroListProps {
  roomId: string;
}

export function CarometroList({ roomId }: CarometroListProps) {
  const { students, isLoading, error, refreshStudents, removeStudent } =
    useCarometro(roomId);

  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);

  const handleConfirmRemove = async () => {
    if (!studentToRemove) return;
    await removeStudent(studentToRemove.id);
    setStudentToRemove(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* 1. Destaque Central: Título "Carômetro" */}
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-[2rem] py-4 sm:py-4.5 px-8 shadow-sm border border-gray-100/80 mb-6 sm:mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Carômetro
        </h2>
      </div>

      {/* 2. Conteúdo / Lista de Alunos */}
      {isLoading ? (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="w-full h-16 bg-gray-200/80 rounded-full animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-2xl p-5 text-center flex flex-col items-center gap-3">
          <AlertCircle className="text-red-500" size={32} />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button
            onClick={() => refreshStudents()}
            className="flex items-center gap-2 text-xs font-semibold text-red-800 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="w-full max-w-md text-center py-12 px-4 bg-white/60 border border-gray-100 rounded-3xl">
          <Users size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-base font-semibold text-gray-700">
            Nenhum aluno cadastrado
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Os alunos matriculados nesta sala aparecerão aqui.
          </p>
        </div>
      ) : (
        /* Responsividade: Mobile 1 coluna | Desktop Grid 2 a 3 colunas */
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onAction={(st) => setStudentToRemove(st)}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmação simples de desvinculação */}
      {studentToRemove && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setStudentToRemove(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl flex flex-col items-center text-center gap-4 border border-gray-100"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Remover aluno?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Deseja desvincular <strong>{studentToRemove.name}</strong> da turma?
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
