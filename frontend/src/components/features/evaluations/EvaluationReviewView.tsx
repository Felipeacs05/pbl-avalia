// src/components/features/evaluations/EvaluationReviewView.tsx
"use client";

import React from "react";
import { useRooms } from "../../../hooks/useRooms";
import { useEvaluations } from "../../../hooks/useEvaluations";
import { ProblemDetailsHeader } from "../problem-details/ProblemDetailsHeader";
import { Toast } from "../../ui/Toast";
import { EvaluationReviewList } from "./EvaluationReviewList";
import { EditGradeModal } from "./EditGradeModal";
import { CheckCircle2 } from "lucide-react";

export interface EvaluationReviewViewProps {
  roomId?: string;
  problemId?: string;
  sessionId: string;
  onBack: () => void;
}

export function EvaluationReviewView({
  roomId,
  sessionId,
  onBack,
}: EvaluationReviewViewProps) {
  const { rooms } = useRooms();
  const {
    reviews,
    selectedStudent,
    isLoading,
    isSubmitting,
    error,
    toast,
    setToast,
    openEditModal,
    closeEditModal,
    submitGradeAdjustment,
    launchAllGrades,
  } = useEvaluations(sessionId);

  const room = roomId ? rooms.find((r) => r.id === roomId) : null;
  const roomCodeTag = room
    ? `${room.code} - ${room.semester ?? "2026.2"}`
    : "TEC498 - 2026.2";

  return (
    <div className="w-full min-h-screen bg-[#F5F5F5] text-gray-800 flex flex-col font-sans">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header responsivo unificado */}
      <ProblemDetailsHeader
        disciplineTag={roomCodeTag}
        onBack={onBack}
        onShare={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
      />

      {/* ===== MOBILE LAYOUT (< md — proporção 9:16) ===== */}
      <div className="flex-1 flex flex-col justify-between md:hidden">
        <div className="flex-1 px-5 pt-6 pb-6 overflow-y-auto space-y-6">
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-[300px] bg-white border border-gray-200 rounded-full py-3 px-8 shadow-xs text-center">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Revisão de notas
              </h1>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 animate-pulse font-medium">
                Carregando autoavaliações...
              </p>
            </div>
          ) : error && !selectedStudent ? (
            <div
              role="alert"
              className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          ) : (
            <EvaluationReviewList
              reviews={reviews}
              onEditStudent={openEditModal}
            />
          )}
        </div>

        <div className="sticky bottom-0 bg-[#F5F5F5] border-t border-gray-200/60 px-5 py-4">
          <button
            type="button"
            onClick={launchAllGrades}
            disabled={isLoading || isSubmitting}
            data-testid="launch-grades-btn-mobile"
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-sm shadow-sm transition-all text-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Processando..." : "Lançar Notas"}
          </button>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (>= md — 2 colunas igual ao professor) ===== */}
      <div className="hidden md:flex flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-8 gap-8">
        {/* Coluna Esquerda: Card Resumo + Botão Lançar Notas */}
        <div className="w-1/2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              Revisão de notas
            </h1>
            <div className="w-full h-px bg-gray-200 mb-3" />
            <p className="text-sm text-gray-500 leading-relaxed">
              Revise as notas de autoavaliação submetidas pelos alunos nesta sessão tutorial. Clique no ícone de edição ao lado da nota para realizar ajustes com justificativa pedagógica.
            </p>
          </div>

          <button
            type="button"
            onClick={launchAllGrades}
            disabled={isLoading || isSubmitting}
            data-testid="launch-grades-btn"
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={18} />
            <span>{isSubmitting ? "Processando..." : "Lançar Notas"}</span>
          </button>
        </div>

        {/* Coluna Direita: Lista de Alunos */}
        <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 animate-pulse font-medium">
                Carregando autoavaliações...
              </p>
            </div>
          ) : error && !selectedStudent ? (
            <div
              role="alert"
              className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          ) : (
            <EvaluationReviewList
              reviews={reviews}
              onEditStudent={openEditModal}
            />
          )}
        </div>
      </div>

      {/* Modal / Tela de Edição Individual com Justificativa Obrigatória */}
      <EditGradeModal
        isOpen={Boolean(selectedStudent)}
        student={selectedStudent}
        roomCodeTag={roomCodeTag}
        isSubmitting={isSubmitting}
        error={error}
        onClose={closeEditModal}
        onSave={submitGradeAdjustment}
      />
    </div>
  );
}
