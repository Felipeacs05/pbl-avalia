// src/app/assessments/[assessmentId]/grade-adjustment/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GradeAdjustmentPanel } from "../../../../components/features/grade-adjustment/GradeAdjustmentPanel";
import { gradeAdjustmentService } from "../../../../services/gradeAdjustmentService";
import type { SubmittedSelfAssessment } from "../../../../types/gradeAdjustment";

export default function AssessmentGradeAdjustmentPage() {
  const params = useParams();
  const router = useRouter();
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
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col font-sans">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-6 py-1.5 rounded-full tracking-wide select-none border border-[#9BA7D6]">
          TEC499 - 2026.2
        </div>

        <div className="w-10" aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[300px] bg-white border border-gray-200 rounded-full py-3 px-8 shadow-xs text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Revisão de notas
            </h1>
          </div>
        </div>

        {isLoading || !assessment ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Carregando autoavaliação...</p>
          </div>
        ) : (
          <GradeAdjustmentPanel assessment={assessment} />
        )}
      </main>
    </div>
  );
}
