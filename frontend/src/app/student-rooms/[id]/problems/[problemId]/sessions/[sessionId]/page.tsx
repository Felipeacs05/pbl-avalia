/* eslint-disable react-hooks/set-state-in-effect */
// src/app/student-rooms/[id]/problems/[problemId]/sessions/[sessionId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageSquare, UserCheck, Users } from "lucide-react";
import { ProblemDetailsHeader } from "../../../../../../../components/features/problem-details/ProblemDetailsHeader";
import { SelfAssessmentGrade } from "../../../../../../../components/features/grade-adjustment/SelfAssessmentGrade";
import { SessionQuickTagsCard } from "../../../../../../../components/features/feedback/SessionQuickTagsCard";
import { StudentFeedbacksModal } from "../../../../../../../components/features/feedback/StudentFeedbacksModal";
import { StudentSelfEvaluationModal } from "../../../../../../../components/features/evaluations/StudentSelfEvaluationModal";
import { StudentPeerEvaluationModal } from "../../../../../../../components/features/evaluations/StudentPeerEvaluationModal";
import { Toast } from "../../../../../../../components/ui/Toast";
import { useFeedback } from "../../../../../../../hooks/useFeedback";
import { useProblemDetails } from "../../../../../../../hooks/useProblemDetails";
import { MOCK_SESSION_SUMMARY } from "../../../../../../../mocks/feedback.mock";
import { gradeAdjustmentMock } from "../../../../../../../mocks/gradeAdjustment.mock";
import { sessionGradesService, type StudentSessionSummary } from "../../../../../../../services/sessionGradesService";
import { USE_REAL_API } from "../../../../../../../services/apiMode";
import type { SubmittedSelfAssessment } from "../../../../../../../types/gradeAdjustment";

const DEFAULT_STUDENT_ASSESSMENT_ID = "151e1515-e15b-15d5-a515-151515151515";

export default function StudentSessionDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "1";
  const problemId =
    typeof params?.problemId === "string" ? params.problemId : "prob_01";
  const sessionId =
    typeof params?.sessionId === "string" ? params.sessionId : "session_01";

  const [isFeedbacksModalOpen, setIsFeedbacksModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"self" | "peer" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loggedStudentId, setLoggedStudentId] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<StudentSessionSummary | null>(null);

  // Read from localStorage inside a microtask so setState is never called
  // synchronously in the effect body -- avoids react-hooks/set-state-in-effect.
  useEffect(() => {
    Promise.resolve().then(() => {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("user");
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { id?: string };
            if (parsed?.id) setLoggedStudentId(parsed.id);
          } catch {}
        }
      }
    });
  }, []);

  const [myAssessment, setMyAssessment] = useState<SubmittedSelfAssessment>(() =>
    gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
  );

  const activeStudentId = loggedStudentId || "stu_alice";
  const { feedbacks, refreshFeedbacks } = useFeedback(problemId, activeStudentId);

  const loadSummary = React.useCallback(() => {
    if (!sessionId || !loggedStudentId || !USE_REAL_API) return;
    sessionGradesService
      .getStudentSummary(sessionId, loggedStudentId)
      .then((data) => setSessionSummary(data))
      .catch(() => {});
  }, [sessionId, loggedStudentId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const syncData = () => {
      setMyAssessment(
        gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
      );
      void refreshFeedbacks();
      loadSummary();
    };
    syncData();
    window.addEventListener("storage", syncData);
    window.addEventListener("focus", syncData);

    const interval = setInterval(() => {
      loadSummary();
    }, 3500);

    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener("focus", syncData);
      clearInterval(interval);
    };
  }, [refreshFeedbacks, loadSummary]);

  const isGradeReleased = sessionSummary ? sessionSummary.isGradeReleased : !USE_REAL_API;
  const isModifiedByTutor = sessionSummary
    ? sessionSummary.isModifiedByTutor
    : Boolean(myAssessment.modifiedByTutor ?? myAssessment.ajustado_por_tutor);

  const displayScore = sessionSummary
    ? sessionSummary.grade
    : isModifiedByTutor
    ? myAssessment.score
    : USE_REAL_API
    ? null
    : MOCK_SESSION_SUMMARY.grade ?? 7.5;

  const quickTags = sessionSummary
    ? sessionSummary.quickTags
    : USE_REAL_API
    ? []
    : MOCK_SESSION_SUMMARY.quickTags;

  // Título do problema e data da sessão
  const { problem } = useProblemDetails(problemId);
  const session = problem?.sessions.find((s) => s.id === sessionId);
  const problemTitle = sessionSummary?.problemTitle ?? problem?.title ?? MOCK_SESSION_SUMMARY.problemTitle;
  const sessionDateLabel = session?.displayDate ?? MOCK_SESSION_SUMMARY.sessionDate;
  const disciplineTag = problem ? `${problem.disciplineCode} - ${problem.semester}` : MOCK_SESSION_SUMMARY.roomCode;

  const handleOpenMyFeedbacks = () => {
    void refreshFeedbacks();
    setIsFeedbacksModalOpen(true);
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      {/* Header responsivo igual ao fluxo do professor */}
      <ProblemDetailsHeader
        disciplineTag={disciplineTag}
        onBack={() =>
          router.push(`/student-rooms/${roomId}/problems/${problemId}`)
        }
        onShare={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
      />

      {/* ===== MOBILE LAYOUT (< md — proporção 9:16) ===== */}
      <div className="flex-1 flex flex-col md:hidden px-5 pt-5 pb-10 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug underline decoration-gray-200 underline-offset-4">
            {problemTitle}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-lg font-bold text-gray-800">
              Sessão de {sessionDateLabel}
            </p>
            {sessionSummary?.isClosed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                Encerrada
              </span>
            )}
          </div>
        </div>

        <SelfAssessmentGrade
          score={displayScore}
          isGradeReleased={isGradeReleased}
          modifiedByTutor={isModifiedByTutor}
          ajustado_por_tutor={isModifiedByTutor}
          originalGrade={sessionSummary?.originalGrade ?? myAssessment.originalGrade}
          nota_original={sessionSummary?.originalGrade ?? myAssessment.nota_original}
          justification={sessionSummary?.justification ?? myAssessment.justification}
        />

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleOpenMyFeedbacks}
            data-testid="open-my-feedbacks-btn-mobile"
            className="rounded-2xl bg-[#BCC4E8] hover:bg-[#AEB7E2] border-2 border-[#D5DAF2] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <MessageSquare size={24} className="text-gray-900" strokeWidth={2.2} />
            <span className="text-xs font-bold text-gray-900 leading-tight text-center">
              Meu
              <br />
              feedback
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("self")}
            className="rounded-2xl bg-[#E2E4EC] hover:bg-[#D5D8E4] border-2 border-[#C8CCDC] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserCheck size={24} className="text-[#3E4875]" strokeWidth={2.2} />
            <span className="text-xs font-bold text-[#3E4875] leading-tight text-center">
              Autoavaliação
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("peer")}
            className="rounded-2xl bg-[#E2E4EC] hover:bg-[#D5D8E4] border-2 border-[#C8CCDC] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Users size={24} className="text-[#3E4875]" strokeWidth={2.2} />
            <span className="text-xs font-bold text-[#3E4875] leading-tight text-center">
              Avaliação por
              <br />
              pares
            </span>
          </button>
        </div>

        <SessionQuickTagsCard tags={quickTags} />
      </div>

      {/* ===== DESKTOP LAYOUT (>= md — 2 colunas igual ao professor) ===== */}
      <div className="hidden md:flex flex-1 max-w-6xl mx-auto w-full px-6 pt-8 pb-8 gap-8">
        {/* Coluna Esquerda: Resumo da Sessão + Nota + Ações */}
        <div className="w-1/2 flex flex-col gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              {problemTitle}
            </h1>
            <div className="w-full h-px bg-gray-200 mb-3" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#4354A0]">
                Sessão de {sessionDateLabel}
              </p>
              {sessionSummary?.isClosed && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                  Encerrada
                </span>
              )}
            </div>
          </div>

          <SelfAssessmentGrade
            score={displayScore}
            isGradeReleased={isGradeReleased}
            modifiedByTutor={isModifiedByTutor}
            ajustado_por_tutor={isModifiedByTutor}
            originalGrade={sessionSummary?.originalGrade ?? myAssessment.originalGrade}
            nota_original={sessionSummary?.originalGrade ?? myAssessment.nota_original}
            justification={sessionSummary?.justification ?? myAssessment.justification}
          />

          <div className="grid grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={handleOpenMyFeedbacks}
              data-testid="open-my-feedbacks-btn"
              className="rounded-2xl bg-[#BCC4E8] hover:bg-[#AEB7E2] border-2 border-[#D5DAF2] py-4 px-3 flex flex-col items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md active:scale-95 cursor-pointer"
            >
              <MessageSquare size={26} className="text-[#182860]" strokeWidth={2.2} />
              <span className="text-xs sm:text-sm font-bold text-[#182860] leading-tight text-center">
                Meu feedback
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("self")}
              className="rounded-2xl bg-white hover:bg-[#EEEDF8] border-2 border-gray-200 hover:border-[#757DC3]/50 py-4 px-3 flex flex-col items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md active:scale-95 cursor-pointer"
            >
              <UserCheck size={26} className="text-[#4354A0]" strokeWidth={2.2} />
              <span className="text-xs sm:text-sm font-bold text-gray-700 leading-tight text-center">
                Autoavaliação
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("peer")}
              className="rounded-2xl bg-white hover:bg-[#EEEDF8] border-2 border-gray-200 hover:border-[#757DC3]/50 py-4 px-3 flex flex-col items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md active:scale-95 cursor-pointer"
            >
              <Users size={26} className="text-[#4354A0]" strokeWidth={2.2} />
              <span className="text-xs sm:text-sm font-bold text-gray-700 leading-tight text-center">
                Avaliação por pares
              </span>
            </button>
          </div>
        </div>

        {/* Coluna Direita: Card de Marcações Rápidas da Sessão */}
        <div className="w-1/2">
          <SessionQuickTagsCard tags={quickTags} />
        </div>
      </div>

      {/* Modal escuro "Meus Feedbacks" */}
      {isFeedbacksModalOpen && (
        <StudentFeedbacksModal
          feedbacks={feedbacks}
          onClose={() => setIsFeedbacksModalOpen(false)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />}

      {activeModal === "self" && (
        <StudentSelfEvaluationModal
          roomId={roomId}
          problemId={problemId}
          onClose={() => setActiveModal(null)}
          onSubmitted={setToastMessage}
        />
      )}
      {activeModal === "peer" && (
        <StudentPeerEvaluationModal
          roomId={roomId}
          problemId={problemId}
          onClose={() => setActiveModal(null)}
          onSubmitted={setToastMessage}
        />
      )}
    </main>
  );
}
