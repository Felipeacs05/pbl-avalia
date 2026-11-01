// src/components/features/grade-adjustment/GradeAdjustmentPanel.tsx
"use client";

import React from "react";
import { useGradeAdjustment } from "../../../hooks/useGradeAdjustment";
import { GradeAdjustmentForm } from "./GradeAdjustmentForm";
import type {
  GradeAdjustment,
  GradeAdjustmentInput,
  SubmittedSelfAssessment,
} from "../../../types/gradeAdjustment";

export interface GradeAdjustmentPanelProps {
  assessment: SubmittedSelfAssessment;
  onAdjusted?: (adjustment: GradeAdjustment) => void;
}

export function GradeAdjustmentPanel({
  assessment,
  onAdjusted,
}: GradeAdjustmentPanelProps) {
  const { lastAdjustment, error, isLoading, adjustGrade } = useGradeAdjustment();

  const effectiveAssessment: SubmittedSelfAssessment = lastAdjustment
    ? {
        ...assessment,
        score: lastAdjustment.adjustedGrade,
        originalGrade: lastAdjustment.originalGrade,
        nota_original: lastAdjustment.originalGrade,
        adjustedGrade: lastAdjustment.adjustedGrade,
        justification: lastAdjustment.justification,
        modifiedByTutor: lastAdjustment.modifiedByTutor,
        ajustado_por_tutor: lastAdjustment.modifiedByTutor,
      }
    : assessment;

  const handleFormSubmit = async (input: GradeAdjustmentInput) => {
    const result = await adjustGrade(assessment.id, input);
    if (result && onAdjusted) {
      onAdjusted(result);
    }
  };

  return (
    <section className="w-full max-w-md mx-auto">
      <GradeAdjustmentForm
        assessment={effectiveAssessment}
        error={error}
        isSubmitting={isLoading}
        onSubmit={handleFormSubmit}
      />
    </section>
  );
}
