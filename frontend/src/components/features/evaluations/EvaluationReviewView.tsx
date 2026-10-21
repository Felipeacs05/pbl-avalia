// src/components/features/evaluations/EvaluationReviewView.tsx
"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRooms } from "../../../hooks/useRooms";
import { useEvaluations } from "../../../hooks/useEvaluations";
import { Toast } from "../../ui/Toast";
import { EvaluationReviewList } from "./EvaluationReviewList";
import { EditGradeModal } from "./EditGradeModal";

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
    : "TEC499 - 2026.2";

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col justify-between font-sans">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
          aria-label="Voltar para o problema"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-6 py-1.5 rounded-full tracking-wide select-none border border-[#9BA7D6]">
          {roomCodeTag}
        </div>

        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Cápsula de Título: "Revisão de notas" */}
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-[300px] bg-white border border-gray-200 rounded-full py-3 px-8 shadow-xs text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Revisão de notas
            </h1>
          </div>
          <p className="mt-2 text-xs font-medium text-gray-500">
            Autoavaliações submetidas pelos alunos nesta sessão
          </p>
        </div>

        {/* Estado de Carregamento, Erro ou Lista */}
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
          <div className="w-full flex-1">
            <EvaluationReviewList
              reviews={reviews}
              onEditStudent={openEditModal}
            />
          </div>
        )}

        {/* Botão Inferior: "Lançar Notas" */}
        <div className="w-full pt-4 pb-6 mt-auto">
          <button
            type="button"
            onClick={launchAllGrades}
            disabled={isLoading || isSubmitting}
            data-testid="launch-grades-btn"
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Processando..." : "Lançar Notas"}
          </button>
        </div>
      </main>

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
