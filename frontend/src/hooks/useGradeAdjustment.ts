// src/hooks/useGradeAdjustment.ts

import { useState, useCallback } from "react";
import type { GradeAdjustment, GradeAdjustmentInput } from "../types/gradeAdjustment";
import { gradeAdjustmentService } from "../services/gradeAdjustmentService";

interface ServiceError {
  status?: number;
  message?: string;
}

export function useGradeAdjustment() {
  const [lastAdjustment, setLastAdjustment] = useState<GradeAdjustment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const adjustGrade = useCallback(
    async (
      assessmentId: string,
      input: GradeAdjustmentInput
    ): Promise<GradeAdjustment | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const adjustment = await gradeAdjustmentService.adjustGrade(assessmentId, input);
        setLastAdjustment(adjustment);
        setError(null);
        return adjustment;
      } catch (err: unknown) {
        const serviceErr = err as ServiceError;
        const message =
          typeof serviceErr?.message === "string" && serviceErr.message.length > 0
            ? serviceErr.message
            : "Não foi possível salvar o ajuste da nota.";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    lastAdjustment,
    error,
    isLoading,
    adjustGrade,
    clearError,
  };
}
