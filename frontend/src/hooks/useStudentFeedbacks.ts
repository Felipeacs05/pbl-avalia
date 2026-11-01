// src/hooks/useStudentFeedbacks.ts
"use client";

import { useState, useEffect } from "react";
import { feedbackService } from "../services/feedbackService";
import type { StudentFeedback } from "../types/feedback";

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) {
      return msg;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Não foi possível carregar os feedbacks.";
}

export interface UseStudentFeedbacksReturn {
  feedbacks: StudentFeedback[];
  isLoading: boolean;
  error: string | null;
}

interface StudentFeedbacksState {
  resolvedStudentId: string | null;
  feedbacks: StudentFeedback[];
  error: string | null;
}

export function useStudentFeedbacks(studentId: string): UseStudentFeedbacksReturn {
  const [state, setState] = useState<StudentFeedbacksState>({
    resolvedStudentId: null,
    feedbacks: [],
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    feedbackService
      .fetchStudentFeedbacks(studentId)
      .then((data) => {
        if (!isCancelled) {
          setState({
            resolvedStudentId: studentId,
            feedbacks: data,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setState({
            resolvedStudentId: studentId,
            feedbacks: [],
            error: extractErrorMessage(err),
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [studentId]);

  const isLoading = state.resolvedStudentId !== studentId;

  return {
    feedbacks: isLoading ? [] : state.feedbacks,
    isLoading,
    error: isLoading ? null : state.error,
  };
}
