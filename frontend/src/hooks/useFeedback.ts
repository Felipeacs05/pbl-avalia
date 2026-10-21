// src/hooks/useFeedback.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import type { FeedbackItem, FeedbackPayload } from "../types/feedback";
import { getStudentFeedbacks, submitFeedback } from "../services/feedbackService";
import { gradeAdjustmentMock } from "../mocks/gradeAdjustment.mock";

const DEFAULT_ALICE_ASSESSMENT_ID = "151e1515-e15b-15d5-a515-151515151515";

function mergeWithLiveTutorAdjustment(
  problemId: string,
  studentId: string | undefined,
  data: FeedbackItem[]
): FeedbackItem[] {
  const assessment = gradeAdjustmentMock.getAssessmentById(DEFAULT_ALICE_ASSESSMENT_ID);
  const isModified = Boolean(
    assessment.modifiedByTutor ?? assessment.ajustado_por_tutor
  );

  if (!isModified) {
    return data;
  }

  const dynamicAdjustmentCard: FeedbackItem = {
    id: "fb-us15-live",
    problemId,
    targetType: "INDIVIDUAL",
    studentId: studentId ?? "stu_alice",
    studentName: assessment.studentName,
    tutorName: "Roberto Oliveira",
    message:
      assessment.justification || "Professor alterou sua nota da sessão.",
    dateLabel: "12/04 - Problema",
    previousGrade:
      assessment.originalGrade ?? assessment.nota_original ?? 10,
    newGrade: assessment.score,
  };
  const withoutDuplicate = data.filter((item) => item.id !== "fb-us15-live");
  return [dynamicAdjustmentCard, ...withoutDuplicate];
}

export function useFeedback(problemId: string, studentId?: string) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStudentFeedbacks(problemId, studentId);
      setFeedbacks(mergeWithLiveTutorAdjustment(problemId, studentId, data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar feedbacks.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [problemId, studentId]);

  useEffect(() => {
    let isCancelled = false;
    getStudentFeedbacks(problemId, studentId)
      .then((data) => {
        if (!isCancelled) {
          setFeedbacks(mergeWithLiveTutorAdjustment(problemId, studentId, data));
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message =
            err instanceof Error ? err.message : "Erro ao carregar feedbacks.";
          setError(message);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [problemId, studentId]);

  const sendFeedback = async (payload: FeedbackPayload): Promise<FeedbackItem> => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const created = await submitFeedback(payload);
      setFeedbacks((prev) => [created, ...prev]);
      setSuccessMessage("Feedback enviado com sucesso!");
      return created;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao enviar feedback.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    feedbacks,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    sendFeedback,
    refreshFeedbacks: fetchFeedbacks,
  };
}
