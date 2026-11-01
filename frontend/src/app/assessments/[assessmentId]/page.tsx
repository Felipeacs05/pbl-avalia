// src/app/assessments/[assessmentId]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SelfAssessmentGrade } from "../../../components/features/grade-adjustment/SelfAssessmentGrade";
import { gradeAdjustmentService } from "../../../services/gradeAdjustmentService";
import type { SubmittedSelfAssessment } from "../../../types/gradeAdjustment";

export default function StudentAssessmentDetailsPage() {
  const params = useParams();
  const assessmentId = String(params.assessmentId ?? "");

  const [assessment, setAssessment] = useState<SubmittedSelfAssessment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      const data = await gradeAdjustmentService.getAssessment(assessmentId);
      if (mounted) {
        setAssessment(data);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [assessmentId]);

  return (
    <main className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col items-center justify-center px-5 py-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-[1.5rem] border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-900">
          Resultado da Autoavaliação
        </h1>

        {isLoading || !assessment ? (
          <p className="text-sm text-gray-500">Carregando resultado...</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">
              Aluno: <span className="font-bold text-gray-900">{assessment.studentName}</span>
            </p>

            <div className="flex items-center justify-between bg-[#EEEDF8] rounded-2xl p-4 border border-[#757DC3]/30">
              <span className="text-sm font-semibold text-[#2E3A70]">
                Nota Final:
              </span>
              <SelfAssessmentGrade
                score={assessment.score}
                modifiedByTutor={Boolean(
                  assessment.modifiedByTutor ?? assessment.ajustado_por_tutor
                )}
                ajustado_por_tutor={Boolean(
                  assessment.ajustado_por_tutor ?? assessment.modifiedByTutor
                )}
                originalGrade={assessment.originalGrade}
                nota_original={assessment.nota_original}
                justification={assessment.justification}
              />
            </div>

            {assessment.justification && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <p className="font-semibold mb-1">Justificativa do Tutor:</p>
                <p>{assessment.justification}</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
