// src/types/behaviorRecord.ts

/** Aluno que pode receber um registro de comportamento na sessão. */
export interface BehaviorStudent {
  id: string;
  name: string;
}

/** Tag predefinida (ex.: "Atraso"). */
export interface BehaviorTag {
  id: string;
  name: string;
}

/** O registro leva a tag OU o texto livre; o horário e os nomes são do servidor. */
export type BehaviorRecordInput = { tagId: string } | { text: string };

/** Registro como o servidor devolve. */
export interface BehaviorRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  tagId: string | null;
  tagName: string | null;
  text: string | null;
  recordedAt: string;
}
