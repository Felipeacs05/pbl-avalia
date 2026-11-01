// src/hooks/useFeedbacks.ts
"use client";

import { useState, useCallback } from "react";
import { feedbackService } from "../services/feedbackService";
import type { Feedback, FeedbackInput } from "../types/feedback";

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
  return "Não foi possível enviar o feedback.";
}

export interface UseFeedbacksReturn {
  isSending: boolean;
  sentFeedbacks: Feedback[];
  error: string | null;
  sendToStudent: (studentId: string, input: FeedbackInput) => Promise<Feedback | null>;
  sendToClass: (studentIds: string[], input: FeedbackInput) => Promise<Feedback[] | null>;
}

export function useFeedbacks(problemId: string): UseFeedbacksReturn {
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentFeedbacks, setSentFeedbacks] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendToStudent = useCallback(
    async (studentId: string, input: FeedbackInput): Promise<Feedback | null> => {
      setIsSending(true);
      setError(null);
      try {
        const saved = await feedbackService.sendFeedback(problemId, {
          studentId,
          grade: input.grade,
          text: input.text,
        });
        setSentFeedbacks([saved]);
        return saved;
      } catch (err) {
        setSentFeedbacks([]);
        setError(extractErrorMessage(err));
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [problemId]
  );

  const sendToClass = useCallback(
    async (studentIds: string[], input: FeedbackInput): Promise<Feedback[] | null> => {
      setIsSending(true);
      setError(null);
      const items = studentIds.map((studentId) => ({
        studentId,
        grade: input.grade,
        text: input.text,
      }));
      try {
        const saved = await feedbackService.sendBatchFeedback(problemId, items);
        setSentFeedbacks(saved);
        return saved;
      } catch (err) {
        setSentFeedbacks([]);
        setError(extractErrorMessage(err));
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [problemId]
  );

  return {
    isSending,
    sentFeedbacks,
    error,
    sendToStudent,
    sendToClass,
  };
}
