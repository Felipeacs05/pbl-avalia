// src/types/session.ts
import type { SessionStudent } from "./attendance";

/** Situação das notas da sessão: depois de fechadas, não podem mais ser alteradas. */
export interface SessionGradesStatus {
  sessionId: string;
  isClosed: boolean;
  /** Quando as notas foram fechadas (ISO 8601). */
  closedAt?: string;
}

/** Sessão aberta de um problema, com a lista de alunos para a chamada. */
export interface SessionRoster {
  id: string;
  /** Data de abertura em ISO 8601. */
  date: string;
  students: SessionStudent[];
}
