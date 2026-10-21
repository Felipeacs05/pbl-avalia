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
      className={`w-full bg-white rounded-[2rem] border border-gray-200 px-6 py-4 shadow-xs flex items-center justify-between gap-4 ${className}`}
      data-testid="self-assessment-grade"
    >
      <div className="flex flex-col items-start gap-1 min-w-0">
        <p className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-tight">
          SUA NOTA DA SESSÃO
        </p>

        {isModified ? (
          <span
            role="img"
            aria-label="Nota Modificada pelo Tutor"
            title={
              justification
                ? `Nota Modificada pelo Tutor — Justificativa: ${justification}`
                : "Nota Modificada pelo Tutor"
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-xs font-semibold text-amber-900"
          >
            <AlertCircle size={14} className="text-amber-700 shrink-0" aria-hidden="true" />
            <span>Nota Modificada pelo Tutor</span>
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-400">
            Nota liberada
          </span>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-center">
        <span className="text-2xl font-semibold text-gray-900 border-b border-gray-300 px-3 pb-0.5 leading-tight">
          {formattedScore}
        </span>
      </div>
    </div>
  );
}
