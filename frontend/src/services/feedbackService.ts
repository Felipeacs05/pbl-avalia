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
import { authFetch } from "./authFetch";
import { USE_REAL_API } from "./apiMode";

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
    const response = await authFetch(`/api/v1/problems/${problemId}/feedbacks`, {
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
    const response = await authFetch(`/api/v1/problems/${problemId}/feedbacks/batch`, {
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
    const response = await authFetch(`/api/v1/students/${studentId}/feedbacks`);

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
  if (USE_REAL_API && studentId) {
    try {
      const realFeedbacks = await feedbackService.fetchStudentFeedbacks(studentId);
      return realFeedbacks.map((item, idx) => ({
        id: `fb_real_${idx}_${item.createdAt}`,
        problemId,
        targetType: "INDIVIDUAL",
        studentId,
        tutorName: item.tutorName,
        message: item.text,
        dateLabel: item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "Sessão",
        newGrade: item.grade,
      }));
    } catch {
      return [];
    }
  }

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

  if (USE_REAL_API && payload.problemId) {
    if (payload.targetType === "INDIVIDUAL" && payload.studentId) {
      try {
        await feedbackService.sendFeedback(payload.problemId, {
          studentId: payload.studentId,
          grade: 10,
          text: payload.message.trim(),
        });
      } catch (err) {
        console.warn("Could not save feedback to backend API", err);
      }
    } else if (payload.targetType === "CLASS" && payload.studentIds && payload.studentIds.length > 0) {
      try {
        await feedbackService.sendBatchFeedback(
          payload.problemId,
          payload.studentIds.map((sid) => ({
            studentId: sid,
            grade: 10,
            text: payload.message.trim(),
          }))
        );
      } catch (err) {
        console.warn("Could not save batch feedback to backend API", err);
      }
    }
  }

  const newFeedback: FeedbackItem = {
    id: `fb_${Date.now()}`,
    authorId: "tutor_1",
    authorName: "Prof. Dr. Armstrong",
    authorRole: "TUTOR",
    problemId: payload.problemId,
    targetType: payload.targetType,
    studentId: payload.studentId,
    studentName: payload.studentName,
    message: payload.message.trim(),
    createdAt: new Date().toISOString(),
  };

  addStoredFeedback(newFeedback);
  return newFeedback;
}
