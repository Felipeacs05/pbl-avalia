// src/services/sessionGradesService.ts
import type { SessionGradesStatus } from "../types/session";
import { sessionGradesMock } from "../mocks/sessionGrades.mock";
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/sessions";
const FAKE_DELAY_MS = 400;

function wait<T>(value: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value()), FAKE_DELAY_MS));
}

export const sessionGradesService = {
  // Endpoint previsto: GET /api/v1/sessions/{sessionId}/grades/status -> { sessionId, isClosed, closedAt? }
  async getStatus(sessionId: string): Promise<SessionGradesStatus> {
    if (!USE_REAL_API) return wait(() => sessionGradesMock.getStatus(sessionId));

    const response = await fetch(`${BASE_URL}/${sessionId}/grades/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Falha ao consultar as notas da sessão.");
    return response.json();
  },

  // Endpoint previsto: POST /api/v1/sessions/{sessionId}/grades/close
  // Envia as notas já salvas (PUT /sessions/{id}/evaluations/{studentId}) e fecha a sessão.
  // O back-end deve responder 409 se as notas já estiverem fechadas.
  async closeGrades(sessionId: string): Promise<SessionGradesStatus> {
    if (!USE_REAL_API) return wait(() => sessionGradesMock.closeGrades(sessionId));

    const response = await fetch(`${BASE_URL}/${sessionId}/grades/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Falha ao fechar as notas da sessão.");
    return response.json();
  },
};
