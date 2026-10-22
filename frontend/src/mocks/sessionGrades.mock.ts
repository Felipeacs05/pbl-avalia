// src/mocks/sessionGrades.mock.ts
// Simula o back-end do fechamento de notas da sessão enquanto o endpoint não existe.
// Em memória: recarregar a página (F5) reabre as sessões.
import type { SessionGradesStatus } from "../types/session";
import { problemDetailsMock } from "./problem.mock";

const closedSessions = new Map<string, string>(); // sessionId -> closedAt

export const sessionGradesMock = {
  getStatus(sessionId: string): SessionGradesStatus {
    const closedAt = closedSessions.get(sessionId);
    return { sessionId, isClosed: closedAt !== undefined, closedAt };
  },

  isClosed(sessionId: string): boolean {
    return closedSessions.has(sessionId);
  },

  closeGrades(sessionId: string): SessionGradesStatus {
    if (!closedSessions.has(sessionId)) closedSessions.set(sessionId, new Date().toISOString());

    // A sessão só deixa de estar "em andamento" quando as notas são fechadas
    Object.values(problemDetailsMock).forEach((problem) => {
      problem.sessions = problem.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, status: "completed", statusLabel: "Notas fechadas" }
          : session,
      );
    });
    return sessionGradesMock.getStatus(sessionId);
  },
};
