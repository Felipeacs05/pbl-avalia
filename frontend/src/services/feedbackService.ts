// src/services/feedbackService.ts

import type {
  Feedback,
  FeedbackBatchItem,
  FeedbackItem,
  FeedbackPayload,
  StudentFeedback,
  StudentFeedbackPageResponse,
} from "../types/feedback";
import {
  addStoredFeedback,
  loadStoredFeedbacks,
} from "../mocks/feedback.mock";

const DEFAULT_TEXT_REQUIRED_MSG = "O texto do feedback não pode ser vazio";
const SEND_FORBIDDEN_MSG = "Apenas o tutor responsável pela sala pode enviar feedbacks.";
const STUDENT_VIEW_FORBIDDEN_MSG = "Você só pode ver os seus próprios feedbacks.";
const GATEWAY_TIMEOUT_MSG = "O envio demorou demais e não foi concluído. Tente novamente.";

interface ErrorResponsePayload {
  status?: number;
  error?: string;
  message?: string;
  errors?: Record<string, string>;
}

async function parseErrorBody(response: Response): Promise<ErrorResponsePayload | null> {
  try {
    return (await response.json()) as ErrorResponsePayload;
  } catch {
    return null;
  }
}

async function handleSendError(response: Response): Promise<never> {
  if (response.status === 504) {
    throw { status: 504, message: GATEWAY_TIMEOUT_MSG };
  }

  if (response.status === 403) {
    throw { status: 403, message: SEND_FORBIDDEN_MSG };
  }

  const body = await parseErrorBody(response);
  if (response.status === 400) {
    const fieldMessage =
      body?.errors?.text ??
      (body?.errors ? Object.values(body.errors)[0] : undefined) ??
      body?.message ??
      DEFAULT_TEXT_REQUIRED_MSG;
    throw { status: 400, message: fieldMessage };
  }

  throw {
    status: response.status,
    message: body?.message ?? "Erro inesperado ao enviar feedback.",
  };
}

export const feedbackService = {
  async sendFeedback(
    problemId: string,
    payload: FeedbackBatchItem
  ): Promise<Feedback> {
    const response = await fetch(`/api/v1/problems/${problemId}/feedbacks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId: payload.studentId,
        grade: payload.grade,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      await handleSendError(response);
    }

    return (await response.json()) as Feedback;
  },

  async sendBatchFeedback(
    problemId: string,
    items: FeedbackBatchItem[]
  ): Promise<Feedback[]> {
    const response = await fetch(`/api/v1/problems/${problemId}/feedbacks/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feedbacks: items.map((item) => ({
          studentId: item.studentId,
          grade: item.grade,
          text: item.text,
        })),
      }),
    });

    if (!response.ok) {
      await handleSendError(response);
    }

    return (await response.json()) as Feedback[];
  },

  async fetchStudentFeedbacks(studentId: string): Promise<StudentFeedback[]> {
    const response = await fetch(`/api/v1/students/${studentId}/feedbacks`);

    if (!response.ok) {
      if (response.status === 403) {
        throw { status: 403, message: STUDENT_VIEW_FORBIDDEN_MSG };
      }
      const body = await parseErrorBody(response);
      throw {
        status: response.status,
        message: body?.message ?? "Erro ao carregar feedbacks do aluno.",
      };
    }

    const page = (await response.json()) as StudentFeedbackPageResponse;
    return Array.isArray(page.content) ? page.content : [];
  },
};

export async function getStudentFeedbacks(
  problemId: string,
  studentId?: string
): Promise<FeedbackItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const all = loadStoredFeedbacks();
  return all.filter(
    (item) =>
      (!problemId || item.problemId === problemId) &&
      (item.targetType === "CLASS" || !studentId || item.studentId === studentId)
  );
}

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackItem> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  if (!payload.message || !payload.message.trim()) {
    throw new Error(DEFAULT_TEXT_REQUIRED_MSG);
  }

  if (payload.targetType === "INDIVIDUAL" && !payload.studentId) {
    throw new Error("Selecione um aluno para enviar o feedback individual.");
  }

  return addStoredFeedback(payload);
}
