// src/components/features/grade-adjustment/SelfAssessmentGrade.tsx
"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export interface SelfAssessmentGradeProps {
  score: number;
  modifiedByTutor?: boolean;
  ajustado_por_tutor?: boolean;
  originalGrade?: number | null;
  nota_original?: number | null;
  justification?: string | null;
  className?: string;
}

export function formatPtBrGrade(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function SelfAssessmentGrade({
  score,
  modifiedByTutor,
  ajustado_por_tutor,
  justification,
  className = "",
}: SelfAssessmentGradeProps) {
  const isModified = Boolean(modifiedByTutor ?? ajustado_por_tutor);
  const formattedScore = formatPtBrGrade(score);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2.5 ${className}`}
      data-testid="self-assessment-grade"
    >
      <div className="min-w-[72px] py-1.5 px-4 rounded-full bg-[#364385] border-2 border-[#7585CC] text-center font-bold text-white text-sm shadow-sm">
        {formattedScore}
      </div>

      {isModified && (
        <span
          role="img"
          aria-label="Nota Modificada pelo Tutor"
          title={
            justification
              ? `Nota Modificada pelo Tutor — Justificativa: ${justification}`
              : "Nota Modificada pelo Tutor"
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 shadow-xs"
        >
          <AlertCircle size={15} className="text-amber-700 shrink-0" aria-hidden="true" />
          <span>Nota Modificada pelo Tutor</span>
        </span>
      )}
    </div>
  );
}
