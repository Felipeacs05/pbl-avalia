// src/app/student-rooms/[id]/problems/[problemId]/sessions/[sessionId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, UserCheck, Users } from "lucide-react";
import { SelfAssessmentGrade } from "../../../../../../../components/features/grade-adjustment/SelfAssessmentGrade";
import { SessionQuickTagsCard } from "../../../../../../../components/features/feedback/SessionQuickTagsCard";
import { StudentFeedbacksModal } from "../../../../../../../components/features/feedback/StudentFeedbacksModal";
import { useFeedback } from "../../../../../../../hooks/useFeedback";
import { MOCK_SESSION_SUMMARY } from "../../../../../../../mocks/feedback.mock";
import { gradeAdjustmentMock } from "../../../../../../../mocks/gradeAdjustment.mock";
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
  const [myAssessment, setMyAssessment] = useState<SubmittedSelfAssessment>(() =>
    gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
  );

  const { feedbacks, refreshFeedbacks } = useFeedback(problemId, "stu_alice");

  useEffect(() => {
    const syncData = () => {
      setMyAssessment(
        gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
      );
      void refreshFeedbacks();
    };
    syncData();
    window.addEventListener("storage", syncData);
    window.addEventListener("focus", syncData);
    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener("focus", syncData);
    };
  }, [refreshFeedbacks]);

  const isModifiedByTutor = Boolean(
    myAssessment.modifiedByTutor ?? myAssessment.ajustado_por_tutor
  );
  const displayScore = isModifiedByTutor
    ? myAssessment.score
    : MOCK_SESSION_SUMMARY.grade ?? 7.5;

  const sessionDateLabel =
    sessionId === "session_hoje"
      ? "Hoje"
      : sessionId === "session_02"
      ? "03/04"
      : MOCK_SESSION_SUMMARY.sessionDate;

  return (
    <main className="w-full min-h-screen bg-[#F5F5F7] font-sans flex flex-col pb-10">
      {/* Header superior */}
      <header className="w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between max-w-md mx-auto">
        <button
          type="button"
          onClick={() =>
            router.push(`/student-rooms/${roomId}/problems/${problemId}`)
          }
          aria-label="Voltar para sessões realizadas"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/60 active:scale-95 transition-all text-gray-900 cursor-pointer"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="bg-[#BAC2E6] text-[#2E3A70] text-xs font-bold px-8 py-1.5 rounded-full tracking-wide select-none border border-[#96A2D8]">
          {MOCK_SESSION_SUMMARY.roomCode}
        </div>

        <div className="w-10" aria-hidden="true" />
      </header>

      <div className="w-full max-w-md mx-auto px-5 pt-2 flex flex-col gap-5">
        {/* Título do Problema e Data da Sessão */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug underline decoration-gray-200 underline-offset-4">
            {MOCK_SESSION_SUMMARY.problemTitle}
          </h1>
          <p className="text-xl font-bold text-gray-900 mt-1">
            Sessão de {sessionDateLabel}
          </p>
        </div>

        {/* Card Branco "SUA NOTA DA SESSÃO" com alerta condicional da US15 */}
        <SelfAssessmentGrade
          score={displayScore}
          modifiedByTutor={isModifiedByTutor}
          ajustado_por_tutor={isModifiedByTutor}
          originalGrade={myAssessment.originalGrade}
          nota_original={myAssessment.nota_original}
          justification={myAssessment.justification}
        />

        {/* Grade com os 3 botões de ação conforme Figma Print 3 */}
        <div className="grid grid-cols-3 gap-3">
          {/* Botão 1: Meu feedback (abre o modal Meus Feedbacks) */}
          <button
            type="button"
            onClick={() => {
              void refreshFeedbacks();
              setIsFeedbacksModalOpen(true);
            }}
            data-testid="open-my-feedbacks-btn"
            className="rounded-2xl bg-[#BCC4E8] hover:bg-[#AEB7E2] border-2 border-[#D5DAF2] py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <MessageSquare size={26} className="text-gray-900" strokeWidth={2.2} />
            <span className="text-xs font-bold text-gray-900 leading-tight text-center">
              Meu
              <br />
              feedback
            </span>
          </button>

          {/* Botão 2: Autoavaliação */}
          <button
            type="button"
            onClick={() => router.push("/selfevaluation")}
            className="rounded-2xl bg-[#9E9E9E] hover:bg-[#8E8E8E] border-2 border-[#757575] py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserCheck size={26} className="text-[#555555]" strokeWidth={2.2} />
            <span className="text-xs font-bold text-[#555555] leading-tight text-center">
              Autoavaliação
            </span>
          </button>

          {/* Botão 3: Avaliação por pares */}
          <button
            type="button"
            onClick={() => router.push("/peerevaluation")}
            className="rounded-2xl bg-[#9E9E9E] hover:bg-[#8E8E8E] border-2 border-[#757575] py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Users size={26} className="text-[#555555]" strokeWidth={2.2} />
            <span className="text-xs font-bold text-[#555555] leading-tight text-center">
              Avaliação por
              <br />
              pares
            </span>
          </button>
        </div>

        {/* Card Roxo "Feedback" com as pílulas de observações rápidas da sessão */}
        <SessionQuickTagsCard tags={MOCK_SESSION_SUMMARY.quickTags} />
      </div>

      {/* Modal escuro "Meus Feedbacks" conforme Figma Print 4 */}
      {isFeedbacksModalOpen && (
        <StudentFeedbacksModal
          feedbacks={feedbacks}
          onClose={() => setIsFeedbacksModalOpen(false)}
        />
      )}
    </main>
  );
}
