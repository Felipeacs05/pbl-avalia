// src/mocks/sessionGrades.mock.ts
// Simula o back-end da publicação de notas da sessão enquanto o endpoint não existe.
// Em memória: recarregar a página (F5) despublica tudo.
import type { SessionGradesStatus } from "../types/session";

const publishedBySession = new Map<string, Set<string>>(); // sessionId -> ids dos alunos publicados

export const sessionGradesMock = {
  getStatus(sessionId: string): SessionGradesStatus {
    return { sessionId, publishedStudentIds: Array.from(publishedBySession.get(sessionId) ?? []) };
  },

  // Publicar de novo um aluno já publicado atualiza as notas dele
  publishGrades(sessionId: string, studentIds: string[]): SessionGradesStatus {
    const published = publishedBySession.get(sessionId) ?? new Set<string>();
    studentIds.forEach((id) => published.add(id));
    publishedBySession.set(sessionId, published);
    return sessionGradesMock.getStatus(sessionId);
  },

  unpublishGrades(sessionId: string, studentIds: string[]): SessionGradesStatus {
    const published = publishedBySession.get(sessionId);
    studentIds.forEach((id) => published?.delete(id));
    return sessionGradesMock.getStatus(sessionId);
  },
};
