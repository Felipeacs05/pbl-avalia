// src/app/student-rooms/[id]/problems/[problemId]/sessions/[sessionId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useRooms } from "../../../../../../../hooks/useRooms";
import { useStudentsRoom } from "../../../../../../../hooks/useStudentsRoom";
import { MOCK_SESSION_SUMMARY } from "../../../../../../../mocks/feedback.mock";
import { gradeAdjustmentMock } from "../../../../../../../mocks/gradeAdjustment.mock";
import { gradeAdjustmentService } from "../../../../../../../services/gradeAdjustmentService";
import { USE_REAL_API } from "../../../../../../../services/apiMode";
import type { SubmittedSelfAssessment } from "../../../../../../../types/gradeAdjustment";
import type { FeedbackItem, SessionQuickTags } from "../../../../../../../types/feedback";

const DEFAULT_STUDENT_ASSESSMENT_ID = "151e1515-e15b-15d5-a515-151515151515";
const IS_TEST = process.env.NODE_ENV === "test";

export default function StudentSessionDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = typeof params?.id === "string" ? params.id : "1";
  const problemId =
    typeof params?.problemId === "string" ? params.problemId : "prob_01";
  const sessionId =
    typeof params?.sessionId === "string" ? params.sessionId : "session_01";

  const [isFeedbacksModalOpen, setIsFeedbacksModalOpen] = useState(false);
  // Autoavaliação e avaliação por pares abrem como modal, sem trocar de tela
  const [activeModal, setActiveModal] = useState<"self" | "peer" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myAssessment, setMyAssessment] = useState<SubmittedSelfAssessment & { hasAssessment?: boolean }>(() =>
    USE_REAL_API && !IS_TEST
      ? {
          hasAssessment: false,
          id: "",
          studentId: "",
          studentName: "Estudante",
          score: 0,
          comment: "",
          modifiedByTutor: false,
          ajustado_por_tutor: false,
          originalGrade: null,
          nota_original: null,
          adjustedGrade: null,
          justification: null,
        }
      : gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
  );
  const [quickTags, setQuickTags] = useState<SessionQuickTags>(() =>
    USE_REAL_API && !IS_TEST
      ? { positive: [], negative: [], comments: [] }
      : MOCK_SESSION_SUMMARY.quickTags
  );

  const { feedbacks, refreshFeedbacks } = useFeedback(
    problemId,
    USE_REAL_API && !IS_TEST ? undefined : "stu_alice"
  );

  const syncData = useCallback(async () => {
    if (USE_REAL_API && !IS_TEST) {
      const summary = await gradeAdjustmentService.getStudentSessionSummary(sessionId, problemId);
      setMyAssessment(summary.assessment);
      setQuickTags(summary.quickTags);
      void refreshFeedbacks();
      return;
    }
    setMyAssessment(
      gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
    );
    void refreshFeedbacks();
  }, [sessionId, problemId, refreshFeedbacks]);

  useEffect(() => {
    void syncData();
    window.addEventListener("storage", syncData);
    window.addEventListener("focus", syncData);
    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener("focus", syncData);
    };
  }, [syncData]);

  const isModifiedByTutor = Boolean(
    myAssessment.modifiedByTutor ?? myAssessment.ajustado_por_tutor
  );
  const displayScore =
    USE_REAL_API && !IS_TEST
      ? myAssessment.score ?? 0
      : isModifiedByTutor
        ? myAssessment.score
        : MOCK_SESSION_SUMMARY.grade ?? 7.5;

  // Título do problema, sala e data da sessão
  const { problem } = useProblemDetails(problemId);
  const { rooms: tutorRooms } = useRooms();
  const { rooms: studentRooms } = useStudentsRoom();
  const room =
    studentRooms.find((r) => r.id === roomId) ??
    tutorRooms.find((r) => r.id === roomId);

  const session = problem?.sessions.find((s) => s.id === sessionId);
  const problemTitle =
    problem?.title ?? (USE_REAL_API && !IS_TEST ? "Problema" : MOCK_SESSION_SUMMARY.problemTitle);
  const sessionDateLabel =
    session?.displayDate ?? (USE_REAL_API && !IS_TEST ? "Hoje" : MOCK_SESSION_SUMMARY.sessionDate);
  const disciplineTag = room
    ? `${room.code} - ${room.semester ?? "2026.2"}`
    : problem
      ? `${problem.disciplineCode} - ${problem.semester}`
      : USE_REAL_API && !IS_TEST
        ? "Sala Tutorial"
        : MOCK_SESSION_SUMMARY.roomCode;

  // Se o tutor ajustou a nota real no backend, inclui o card do ajuste na lista de feedbacks
  const combinedFeedbacks: FeedbackItem[] =
    USE_REAL_API && !IS_TEST && isModifiedByTutor
      ? [
          {
            id: `adjustment-${myAssessment.id || "live"}`,
            problemId,
            targetType: "INDIVIDUAL",
            studentId: myAssessment.studentId,
            studentName: myAssessment.studentName,
            tutorName: room?.tutor || "Tutor",
            message:
              myAssessment.justification || "O tutor ajustou sua nota da sessão.",
            dateLabel: `${sessionDateLabel} - ${problemTitle}`,
            previousGrade:
              myAssessment.originalGrade ?? myAssessment.nota_original ?? undefined,
            newGrade: myAssessment.score,
          },
          ...feedbacks,
        ]
      : feedbacks;

  const handleOpenMyFeedbacks = () => {
    void syncData();
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
          <p className="text-lg font-bold text-gray-800 mt-1">
            Sessão de {sessionDateLabel}
          </p>
        </div>

        <SelfAssessmentGrade
          score={displayScore}
          modifiedByTutor={isModifiedByTutor}
          ajustado_por_tutor={isModifiedByTutor}
          originalGrade={myAssessment.originalGrade}
          nota_original={myAssessment.nota_original}
          justification={myAssessment.justification}
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
            <p className="text-sm font-semibold text-[#4354A0]">
              Sessão de {sessionDateLabel}
            </p>
          </div>

          <SelfAssessmentGrade
            score={displayScore}
            modifiedByTutor={isModifiedByTutor}
            ajustado_por_tutor={isModifiedByTutor}
            originalGrade={myAssessment.originalGrade}
            nota_original={myAssessment.nota_original}
            justification={myAssessment.justification}
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
          feedbacks={combinedFeedbacks}
          onClose={() => setIsFeedbacksModalOpen(false)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />}

      {activeModal === "self" && (
        <StudentSelfEvaluationModal
          roomId={roomId}
          problemId={problemId}
          onClose={() => setActiveModal(null)}
          onSubmitted={(msg) => {
            setToastMessage(msg);
            void syncData();
          }}
        />
      )}
      {activeModal === "peer" && (
        <StudentPeerEvaluationModal
          roomId={roomId}
          problemId={problemId}
          onClose={() => setActiveModal(null)}
          onSubmitted={(msg) => {
            setToastMessage(msg);
            void syncData();
          }}
        />
      )}
    </main>
  );
}
