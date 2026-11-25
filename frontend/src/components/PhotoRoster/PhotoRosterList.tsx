// src/components/PhotoRoster/PhotoRosterList.tsx
"use client";

import React, { useCallback, useState } from "react";
import { usePhotoRoster } from "../../hooks/usePhotoRoster";
import { StudentCard } from "./StudentCard";
import type { Student } from "../../types/student";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Toast } from "../ui/Toast";
import { Users, AlertCircle, RefreshCw } from "lucide-react";

interface PhotoRosterListProps {
  roomId: string;
}

export function PhotoRosterList({ roomId }: PhotoRosterListProps) {
  const {
    students,
    isLoading,
    error,
    isRemoving,
    removeError,
    refreshStudents,
    removeStudent,
  } = usePhotoRoster(roomId);

  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [dismissedError, setDismissedError] = useState<{
    text: string;
    attempt: number;
  } | null>(null);

  const clearSuccess = useCallback(() => setSuccessMessage(null), []);
  const dismissError = useCallback(() => {
    if (removeError) {
      setDismissedError({ text: removeError, attempt: attemptCount });
    }
  }, [removeError, attemptCount]);

  const showRemoveError =
    Boolean(removeError) &&
    !(
      dismissedError?.text === removeError &&
      dismissedError?.attempt === attemptCount
    );

  const handleConfirmRemove = async () => {
    if (!studentToRemove) return;
    const target = studentToRemove;
    setSuccessMessage(null);
    setAttemptCount((prev) => prev + 1);
    const removed = await removeStudent(target.id);
    setStudentToRemove(null);
    if (removed) {
      setSuccessMessage(`Aluno ${target.name} removido da sala.`);
    }
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

      {/* Modal de confirmação de desvinculação com aviso de preservação de histórico */}
      {studentToRemove && (
        <ConfirmModal
          role="dialog"
          modalId="modal-confirmar-remocao"
          messageId="texto-aviso-historico"
          confirmButtonId="btn-confirmar-remocao"
          cancelButtonId="btn-cancelar-remocao"
          title="Remover aluno?"
          message={
            <>
              Deseja desvincular <strong>{studentToRemove.name}</strong> da turma? O{" "}
              <strong>histórico será preservado</strong> (notas, presenças e feedbacks) e o{" "}
              <strong>acesso será revogado</strong>.
            </>
          }
          confirmLabel="Remover"
          variant="danger"
          isLoading={isRemoving}
          onConfirm={handleConfirmRemove}
          onClose={() => setStudentToRemove(null)}
        />
      )}

      {successMessage && (
        <Toast message={successMessage} type="success" onClose={clearSuccess} />
      )}
      {showRemoveError && removeError && (
        <Toast message={removeError} type="error" onClose={dismissError} />
      )}
    </div>
  );
}
