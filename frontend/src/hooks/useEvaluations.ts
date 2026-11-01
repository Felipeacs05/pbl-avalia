// src/hooks/useEvaluations.ts

import { useState, useEffect, useCallback } from "react";
import type {
  GradeAdjustmentInput,
  StudentSelfEvaluationReview,
} from "../types/gradeAdjustment";
import { gradeAdjustmentService } from "../services/gradeAdjustmentService";
import { gradeAdjustmentMock } from "../mocks/gradeAdjustment.mock";

export interface EvaluationToastState {
  message: string;
  type: "success" | "error";
}

interface ApiErrorShape {
  status?: number;
  message?: string;
}

export function useEvaluations(sessionId: string) {
  const [reviews, setReviews] = useState<StudentSelfEvaluationReview[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSelfEvaluationReview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<EvaluationToastState | null>(null);

  const loadSessionReviews = useCallback(async () => {
    return gradeAdjustmentService.getSessionSelfEvaluations(sessionId);
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const data = await loadSessionReviews();
        if (mounted) {
          setReviews(data);
          setError(null);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Não foi possível carregar as autoavaliações da sessão.");
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [loadSessionReviews]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loadSessionReviews();
      setReviews(data);
    } catch {
      setError("Não foi possível carregar as autoavaliações da sessão.");
    } finally {
      setIsLoading(false);
    }
  }, [loadSessionReviews]);

  const openEditModal = useCallback((student: StudentSelfEvaluationReview) => {
    if (student.status === "pending") return;
    setError(null);
    setSelectedStudent(student);
  }, []);

  const closeEditModal = useCallback(() => {
    setError(null);
    setSelectedStudent(null);
  }, []);

  const submitGradeAdjustment = useCallback(
    async (
      assessmentId: string,
      input: GradeAdjustmentInput
    ): Promise<boolean> => {
      const trimmedJustification = input.justification.trim();
      if (!trimmedJustification) {
        setError("Justificativa é obrigatória");
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const result = await gradeAdjustmentService.adjustGrade(assessmentId, {
          adjustedGrade: input.adjustedGrade,
          justification: trimmedJustification,
        });

        gradeAdjustmentMock.adjustGrade(assessmentId, {
          adjustedGrade: result.adjustedGrade,
          justification: result.justification,
        });

        setReviews((prev) =>
          prev.map((item) => {
            if (item.id !== assessmentId) return item;
            const preservedOriginal =
              item.originalGrade ?? item.nota_original ?? item.score;
            return {
              ...item,
              originalGrade: result.originalGrade ?? preservedOriginal,
              nota_original: result.originalGrade ?? preservedOriginal,
              adjustedGrade: result.adjustedGrade,
              score: result.adjustedGrade,
              justification: result.justification,
              modifiedByTutor: true,
              ajustado_por_tutor: true,
            };
          })
        );

        setToast({
          message: "Nota ajustada com sucesso e registrada para auditoria!",
          type: "success",
        });
        setSelectedStudent(null);
        return true;
      } catch (err: unknown) {
        const apiErr = err as ApiErrorShape;
        const message =
          apiErr?.message || "Erro ao salvar o ajuste de nota. Tente novamente.";
        setError(message);
        setToast({
          message,
          type: "error",
        });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const launchAllGrades = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setToast({
        message: "Notas de autoavaliação revisadas e lançadas com sucesso!",
        type: "success",
      });
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    reviews,
    selectedStudent,
    isLoading,
    isSubmitting,
    error,
    toast,
    setToast,
    openEditModal,
    closeEditModal,
    submitGradeAdjustment,
    launchAllGrades,
    refresh,
  };
}
