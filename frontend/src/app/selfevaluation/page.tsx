// src/app/selfevaluation/page.tsx
"use client";

import React, { useState } from "react";
import { ClipboardCheck, Lock } from "lucide-react";
import { useEvaluationManager } from "../../hooks/useEvaluationManager";
import { useMyGroup } from "../../hooks/useMyGroup";
import { SelfEvaluationModal } from "../../components/features/evaluations/SelfEvaluationModal";
import { SelfAssessmentGrade } from "../../components/features/grade-adjustment/SelfAssessmentGrade";
import { Toast } from "../../components/ui/Toast";
import {
  selfEvaluationMock,
  SELF_EVALUATION_MOCK_PROBLEM_ID,
  SELF_EVALUATION_MOCK_ROOM_ID,
} from "../../mocks/selfEvaluation.mock";
import { gradeAdjustmentMock } from "../../mocks/gradeAdjustment.mock";
import { authMockSuccess } from "../../mocks/auth.mock";
import type { SubmittedSelfAssessment } from "../../types/gradeAdjustment";

const DEFAULT_STUDENT_ASSESSMENT_ID = "151e1515-e15b-15d5-a515-151515151515";

export default function SelfEvaluationPage() {
  const roomId = SELF_EVALUATION_MOCK_ROOM_ID;
  const problemId = SELF_EVALUATION_MOCK_PROBLEM_ID;

  const { evaluationStatus, isLoading } = useEvaluationManager(problemId);

  const { group } = useMyGroup(roomId);
  const currentStudentId = authMockSuccess.user?.id;
  const peers = group?.members.filter((member) => member.id !== currentStudentId) ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myAssessment] = useState<SubmittedSelfAssessment>(() =>
    gradeAdjustmentMock.getAssessmentById(DEFAULT_STUDENT_ASSESSMENT_ID)
  );

  const isSelfEvaluationOpen = evaluationStatus.activeType === "self_evaluation";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans flex flex-col items-center justify-center px-5 py-10">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        {/* Painel de Nota da Autoavaliação do Aluno (US15 UX Requisito) */}
        {myAssessment && (
          <section
            aria-label="Sua nota de autoavaliação"
            className="w-full bg-white rounded-[1.5rem] border border-gray-200 p-5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Sua Autoavaliação
                </p>
                <p className="text-base font-bold text-gray-800">
                  {myAssessment.studentName}
                </p>
              </div>

              <SelfAssessmentGrade
                score={myAssessment.score}
                modifiedByTutor={Boolean(
                  myAssessment.modifiedByTutor ?? myAssessment.ajustado_por_tutor
                )}
                ajustado_por_tutor={Boolean(
                  myAssessment.ajustado_por_tutor ?? myAssessment.modifiedByTutor
                )}
                originalGrade={myAssessment.originalGrade}
                nota_original={myAssessment.nota_original}
                justification={myAssessment.justification}
              />
            </div>

            {(myAssessment.modifiedByTutor || myAssessment.ajustado_por_tutor) &&
              myAssessment.justification && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <span className="font-semibold">Justificativa do Tutor: </span>
                  <span>{myAssessment.justification}</span>
                </div>
              )}
          </section>
        )}

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || !isSelfEvaluationOpen}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 bg-[#4354A0] hover:bg-[#384890] text-white active:scale-[0.98] cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isSelfEvaluationOpen || isLoading ? (
            <ClipboardCheck size={18} />
          ) : (
            <Lock size={18} />
          )}
          <span>{isLoading ? "Carregando..." : "Autoavaliação"}</span>
        </button>

        {!isLoading && !isSelfEvaluationOpen && (
          <p className="text-xs text-gray-500 text-center">
            A autoavaliação ainda não foi liberada pelo tutor.
          </p>
        )}
      </div>

      <SelfEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEvaluationOpen={isSelfEvaluationOpen}
        peers={peers}
        onSubmit={async (data) => {
          await selfEvaluationMock.submit(problemId, data);
          setToastMessage("Autoavaliação enviada com sucesso!");
        }}
      />
    </main>
  );
}
