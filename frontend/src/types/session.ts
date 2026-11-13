// src/types/session.ts
import type { SessionStudent } from "./attendance";

/** Alunos da sessão que já têm as notas publicadas (o professor pode atualizar ou despublicar). */
export interface SessionGradesStatus {
  sessionId: string;
  publishedStudentIds: string[];
}

/** Sessão aberta de um problema, com a lista de alunos para a chamada. */
export interface SessionRoster {
  id: string;
  /** Data de abertura em ISO 8601. */
  date: string;
  students: SessionStudent[];
}
