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
import { FeedbackFormModal } from "../../../../../components/features/feedback/FeedbackFormModal";
import { ReportExportModal } from "../../../../../components/features/reports/ReportExportModal";
import { useFeedback } from "../../../../../hooks/useFeedback";
import { MOCK_FEEDBACK_STUDENTS } from "../../../../../mocks/feedback.mock";
import { Toast } from "../../../../../components/ui/Toast";
import type { Session } from "../../../../../types/problem";
import type { ReportScope } from "../../../../../types/reportExport";
import {
  FileQuestion,
  CheckCircle2,
  MessageSquarePlus,
  BarChart3,
} from "lucide-react";

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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [exportModalState, setExportModalState] = useState<{
    scope: ReportScope;
    title?: string;
    subtitle?: string;
  } | null>(null);
  const { sendFeedback } = useFeedback(problemId);

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
      router.push(
        `/teacher-rooms/${roomId}/problems/${problemId}/sessions/${result.sessionId}`
      );
    }
  };

  const handleEvaluateSession = (sessionId: string) => {
    router.push(
      `/teacher-rooms/${roomId}/problems/${problemId}/sessions/${sessionId}/evaluate`
    );
  };

  const handleSelectPastSession = (session: Session) => {
    router.push(
      `/teacher-rooms/${roomId}/problems/${problemId}/sessions/${session.id}/review`
    );
  };

  const handleOpenProblemExport = () => {
    setExportModalState({
      scope: { type: "problem", roomId, problemId },
      title: `Exportar Relatório — ${problem?.title ?? "Problema"}`,
      subtitle:
        "Extraia o consolidado parcial de notas e frequência de todas as sessões deste problema.",
    });
  };

  const handleOpenSessionExport = (session: Session) => {
    setExportModalState({
      scope: { type: "session", roomId, sessionId: session.id },
      title: `Exportar Sessão (${session.displayDate})`,
      subtitle:
        "Extraia a chamada, as funções desempenhadas e as avaliações desta sessão específica.",
    });
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
                      <p className="text-xs text-gray-500 font-medium">
                        Status da Avaliação
                      </p>
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
              <PastSessionsList
                sessions={problem.sessions}
                onSelectSession={handleSelectPastSession}
                onEvaluateSession={handleEvaluateSession}
                onExportSession={handleOpenSessionExport}
              />
            </div>

            {/* Fixed-bottom footer action */}
            <div className="sticky bottom-0 bg-[#F5F5F5] border-t border-gray-200/60 px-5 py-4 space-y-3">
              <ReleaseEvaluationButton
                onClick={openModal}
                isLoading={isLoadingEvaluation}
                isReleased={evaluationStatus.isReleased}
                activeType={evaluationStatus.activeType}
              />
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                data-testid="open-feedback-modal-btn-mobile"
                className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 bg-[#4354A0] hover:bg-[#364485] text-white active:scale-[0.98] cursor-pointer"
              >
                <MessageSquarePlus size={18} aria-hidden="true" />
                <span>Enviar Feedback</span>
              </button>
              <button
                type="button"
                onClick={handleOpenProblemExport}
                data-testid="open-problem-export-modal-btn-mobile"
                className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 bg-[#757DC3] hover:bg-[#6870B5] text-white active:scale-[0.98] cursor-pointer"
              >
                <BarChart3 size={18} aria-hidden="true" />
                <span>Extrair Relatório do Problema</span>
              </button>
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
                      <p className="text-xs text-gray-500 font-medium">
                        Status da Avaliação
                      </p>
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

              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                data-testid="open-feedback-modal-btn"
                className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 bg-[#4354A0] hover:bg-[#364485] text-white active:scale-[0.98] cursor-pointer"
              >
                <MessageSquarePlus size={18} aria-hidden="true" />
                <span>Enviar Feedback</span>
              </button>

              <button
                type="button"
                onClick={handleOpenProblemExport}
                data-testid="open-problem-export-modal-btn"
                className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 bg-[#757DC3] hover:bg-[#6870B5] text-white active:scale-[0.98] cursor-pointer"
              >
                <BarChart3 size={18} aria-hidden="true" />
                <span>Extrair Relatório do Problema</span>
              </button>
            </div>

            {/* Right column: Session history */}
            <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-8rem)]">
              <PastSessionsList
                sessions={problem.sessions}
                onSelectSession={handleSelectPastSession}
                onEvaluateSession={handleEvaluateSession}
                onExportSession={handleOpenSessionExport}
              />
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

      {/* Feedback Form Modal (US16) */}
      {isFeedbackModalOpen && (
        <FeedbackFormModal
          problemId={problemId}
          students={MOCK_FEEDBACK_STUDENTS}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSubmit={async (payload) => {
            await sendFeedback(payload);
            setToastMessage(
              payload.targetType === "CLASS"
                ? "Feedback enviado para toda a turma com sucesso!"
                : "Feedback individual enviado com sucesso!"
            );
          }}
        />
      )}

      {/* Report Export Modal (US19 - Problem or Session Scope) */}
      {exportModalState && (
        <ReportExportModal
          scope={exportModalState.scope}
          title={exportModalState.title}
          subtitle={exportModalState.subtitle}
          onClose={() => setExportModalState(null)}
        />
      )}
    </main>
  );
}
