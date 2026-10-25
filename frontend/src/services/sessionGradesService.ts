// src/services/sessionGradesService.ts
import type { SessionGradesStatus } from "../types/session";
import { sessionGradesMock } from "../mocks/sessionGrades.mock";
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/sessions";
const FAKE_DELAY_MS = 400;

function wait<T>(value: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value()), FAKE_DELAY_MS));
}

async function post(sessionId: string, action: "publish" | "unpublish", studentIds: string[], errorMessage: string) {
  const response = await fetch(`${BASE_URL}/${sessionId}/grades/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentIds }),
  });
  if (!response.ok) throw new Error(errorMessage);
  return (await response.json()) as SessionGradesStatus;
}

export const sessionGradesService = {
  // Endpoint previsto: GET /api/v1/sessions/{sessionId}/grades/status -> { sessionId, publishedStudentIds }
  async getStatus(sessionId: string): Promise<SessionGradesStatus> {
    if (!USE_REAL_API) return wait(() => sessionGradesMock.getStatus(sessionId));

    const response = await fetch(`${BASE_URL}/${sessionId}/grades/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Falha ao consultar as notas da sessão.");
    return response.json();
  },

  // Endpoint previsto: POST /api/v1/sessions/{sessionId}/grades/publish  body: { studentIds }
  // Publica as notas dos alunos selecionados; se já estavam publicadas, atualiza.
  async publishGrades(sessionId: string, studentIds: string[]): Promise<SessionGradesStatus> {
    if (!USE_REAL_API) return wait(() => sessionGradesMock.publishGrades(sessionId, studentIds));
    return post(sessionId, "publish", studentIds, "Falha ao publicar as notas da sessão.");
  },

  // Endpoint previsto: POST /api/v1/sessions/{sessionId}/grades/unpublish  body: { studentIds }
  async unpublishGrades(sessionId: string, studentIds: string[]): Promise<SessionGradesStatus> {
    if (!USE_REAL_API) return wait(() => sessionGradesMock.unpublishGrades(sessionId, studentIds));
    return post(sessionId, "unpublish", studentIds, "Falha ao despublicar as notas da sessão.");
  },
};
