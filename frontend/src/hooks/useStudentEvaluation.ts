// src/hooks/useStudentEvaluation.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { StudentEvaluationData } from "../types/performanceTable";
import { studentEvaluationService } from "../services/studentEvaluationService";

const EMPTY_TAGS: string[] = [];

export function useStudentEvaluation(
  sessionId: string,
  studentId: string,
  studentName = "Aluno",
  initialTags: string[] = EMPTY_TAGS
) {
  const [evaluation, setEvaluation] = useState<StudentEvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const tagsKey = initialTags.join(",");

  useEffect(() => {
    let isMounted = true;

    studentEvaluationService
      .getStudentEvaluation(sessionId, studentId, studentName, initialTags)
      .then((data) => {
        if (isMounted) {
          setEvaluation(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, studentId, studentName, tagsKey]);

  // criterionId: id do critério do Pré-set
  const updateCriterionScore = useCallback((criterionId: string, value: number) => {
    setEvaluation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        criteria: {
          ...prev.criteria,
          [criterionId]: value,
        },
      };
    });
  }, []);

  const setMessage = useCallback((message: string) => {
    setEvaluation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        message,
      };
    });
  }, []);

  const saveEvaluation = useCallback(async (): Promise<boolean> => {
    if (!evaluation) return false;
    try {
      setIsSaving(true);
      await studentEvaluationService.saveStudentEvaluation(evaluation);
      setToastType("success");
      setToastMessage("Avaliação salva com sucesso!");
      return true;
    } catch {
      setToastType("error");
      setToastMessage("Erro ao salvar avaliação. Tente novamente.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [evaluation]);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return {
    evaluation,
    isLoading,
    isSaving,
    toastMessage,
    toastType,
    clearToast,
    updateCriterionScore,
    setMessage,
    saveEvaluation,
  };
}
