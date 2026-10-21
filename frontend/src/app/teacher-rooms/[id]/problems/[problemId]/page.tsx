// src/app/teacher-rooms/[id]/problems/[problemId]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProblemDetails } from "../../../../../hooks/useProblemDetails";
import { useRooms } from "../../../../../hooks/useRooms";
import { useEvaluationManager } from "../../../../../hooks/useEvaluationManager";
import { ProblemDetailsHeader } from "../../../../../components/features/problem-details/ProblemDetailsHeader";
import { ProblemInfoCard } from "../../../../../components/features/problem-details/ProblemInfoCard";
import { PastSessionsList } from "../../../../../components/features/problem-details/PastSessionsList";
import { ReleaseEvaluationButton } from "../../../../../components/features/problem-details/ReleaseEvaluationButton";
import { ReleaseEvaluationModal } from "../../../../../components/features/evaluations/ReleaseEvaluationModal";
import { Toast } from "../../../../../components/ui/Toast";
import { FileQuestion, CheckCircle2 } from "lucide-react";

export default function ProblemDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params.id);
  const problemId = String(params.problemId);

  const { rooms, isLoading: isLoadingRooms } = useRooms();
  const {
    problem,
    isLoading: isLoadingProblem,
    isStartingSession,
    startSession,
  } = useProblemDetails(problemId);

  const {
    isModalOpen,
    evaluationStatus,
    selectedType,
    isLoading: isLoadingEvaluation,
    isSubmitting: isSubmittingEvaluation,
    openModal,
    closeModal,
    toggleType,
    confirmRelease,
  } = useEvaluationManager(problemId);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const room = rooms.find((r) => r.id === roomId);
  const isLoading = isLoadingRooms || isLoadingProblem;

  const disciplineTag = room
    ? `${room.code} - ${room.semester ?? ""}`
    : problem
      ? `${problem.disciplineCode} - ${problem.semester}`
      : "...";

  const handleStartSession = async () => {
    const result = await startSession();
    if (result && result.sessionId) {
      router.push(`/teacher-rooms/${roomId}/problems/${problemId}/sessions/${result.sessionId}`);
    }
  };

  const handleConfirmRelease = async () => {
    const updated = await confirmRelease();
    if (updated) {
      if (updated.isReleased) {
        setToastMessage(
          updated.activeType === "self_evaluation"
            ? "Autoavaliação liberada com sucesso!"
            : "Avaliação entre Pares liberada com sucesso!"
        );
      } else {
        setToastMessage("Liberação de avaliações desativada.");
      }
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Sticky header with navigation */}
      <ProblemDetailsHeader
        disciplineTag={disciplineTag}
        // volta sempre para as disciplinas da sala; o back() causava o loop com a sessão
        onBack={() => router.push(`/teacher-rooms/${roomId}/disciplines`)}
        onShare={() => {
          if (navigator.share) {
            navigator.share({
              title: problem?.title ?? "Problem",
              url: window.location.href,
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400 animate-pulse">
              Carregando problema...
            </p>
          </div>
        </div>
      ) : !problem ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileQuestion size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Problema não encontrado.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ===== MOBILE LAYOUT (< md) ===== */}
          <div className="flex-1 flex flex-col md:hidden">
            <div className="flex-1 px-5 pt-6 pb-6 overflow-y-auto space-y-6">
              {/* Problem Card */}
              <ProblemInfoCard
                title={problem.title}
                description={problem.description}
                onStartSession={handleStartSession}
                isStartingSession={isStartingSession}
              />

              {/* Status Badge when an evaluation is released */}
              {evaluationStatus.isReleased && (
                <div className="bg-[#EEEDF8] border border-[#757DC3]/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#4354A0]" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status da Avaliação</p>
                      <p className="text-sm font-semibold text-[#4354A0]">
                        {evaluationStatus.activeType === "self_evaluation"
                          ? "Autoavaliação Liberada"
                          : "Avaliação entre Pares Liberada"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openModal}
                    className="text-xs font-semibold text-[#4354A0] hover:text-[#334195] underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>
              )}

              {/* Past Sessions */}
              <PastSessionsList sessions={problem.sessions} />
            </div>

            {/* Fixed-bottom footer action */}
            <div className="sticky bottom-0 bg-[#F5F5F5] border-t border-gray-200/60 px-5 py-4">
              <ReleaseEvaluationButton
                onClick={openModal}
                isLoading={isLoadingEvaluation}
                isReleased={evaluationStatus.isReleased}
                activeType={evaluationStatus.activeType}
              />
            </div>
          </div>

          {/* ===== DESKTOP LAYOUT (>= md) ===== */}
          <div className="hidden md:flex flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-8 gap-8">
            {/* Left column: Problem details + actions */}
            <div className="w-1/2 flex flex-col gap-5">
              <ProblemInfoCard
                title={problem.title}
                description={problem.description}
                onStartSession={handleStartSession}
                isStartingSession={isStartingSession}
              />

              {/* Status Badge when an evaluation is released */}
              {evaluationStatus.isReleased && (
                <div className="bg-[#EEEDF8] border border-[#757DC3]/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#4354A0]" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status da Avaliação</p>
                      <p className="text-sm font-semibold text-[#4354A0]">
                        {evaluationStatus.activeType === "self_evaluation"
                          ? "Autoavaliação Liberada"
                          : "Avaliação entre Pares Liberada"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openModal}
                    className="text-xs font-semibold text-[#4354A0] hover:text-[#334195] underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>
              )}

              <ReleaseEvaluationButton
                onClick={openModal}
                isLoading={isLoadingEvaluation}
                isReleased={evaluationStatus.isReleased}
                activeType={evaluationStatus.activeType}
              />
            </div>

            {/* Right column: Session history */}
            <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-8rem)]">
              <PastSessionsList sessions={problem.sessions} />
            </div>
          </div>
        </>
      )}

      {/* Release Evaluation Modal */}
      <ReleaseEvaluationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedType={selectedType}
        onToggleType={toggleType}
        onConfirm={handleConfirmRelease}
        isSubmitting={isSubmittingEvaluation}
      />
    </main>
  );
}
