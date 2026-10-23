import type { BehaviorRecord, BehaviorStudent, BehaviorTag } from "@/types/behaviorRecord";

// Mesmos UUIDs dos testes de backend da US11 (sessão e aluno herdados da US09)
export const SESSION_ID = "777e7777-e77b-77d7-a777-777777777777";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "456e4567-e45b-45d4-a456-456745674567";
export const TAG_ID = "888e8888-e88b-88d8-a888-888888888888";
export const OTHER_TAG_ID = "111e1111-e11b-11d1-a111-111111111111";
export const RECORD_ID = "222e2222-e22b-22d2-a222-222222222222";

export const RECORDED_AT = "2026-10-12T14:00:00Z";

// Limite do texto livre: o mesmo @Size(max = 500) do backend
export const TEXT_LIMIT = 500;
// O último caractere é distinto: um corte silencioso no envio seria detectado
export const TEXT_AT_LIMIT = "x".repeat(TEXT_LIMIT - 1) + "!";
export const TEXT_OVER_LIMIT = "x".repeat(TEXT_LIMIT + 1);
export const FREE_TEXT = "Interrompeu o colega duas vezes durante a discussão.";

// Textos completos usados pelos mocks; nas asserções, as regex
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode registrar comportamentos.";
export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode registrar comportamentos/i;
export const TEXT_TOO_LONG_MESSAGE = /o texto deve ter no máximo 500 caracteres/i;

// Confirmação exibida depois de salvar, com o nome devolvido pelo servidor
export const TAG_CONFIRMATION = /atraso registrado para alice souza/i;
export const OTHER_TAG_CONFIRMATION = /celular fora de contexto registrado para alice souza/i;
export const TEXT_CONFIRMATION = /observação registrada para alice souza/i;

// Contrato de erro do service: { status, message }
export const makeForbiddenError = () => ({ status: 403, message: FORBIDDEN_TEXT });

export function makeStudent(overrides: Partial<BehaviorStudent> = {}): BehaviorStudent {
  return { id: STUDENT_ID, name: "Alice Souza", ...overrides };
}

export const makeOtherStudent = (): BehaviorStudent => makeStudent({ id: OTHER_STUDENT_ID, name: "Bruno Lima" });

export function makeTag(overrides: Partial<BehaviorTag> = {}): BehaviorTag {
  return { id: TAG_ID, name: "Atraso", ...overrides };
}

export const makeOtherTag = (): BehaviorTag => makeTag({ id: OTHER_TAG_ID, name: "Celular fora de contexto" });

// Registro como o backend devolve: por padrão, a tag "Atraso" aplicada à Alice
export function makeRecord(overrides: Partial<BehaviorRecord> = {}): BehaviorRecord {
  return {
    id: RECORD_ID,
    sessionId: SESSION_ID,
    studentId: STUDENT_ID,
    studentName: "Alice Souza",
    tagId: TAG_ID,
    tagName: "Atraso",
    text: null,
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

export const makeTextRecord = (text = FREE_TEXT): BehaviorRecord =>
  makeRecord({ tagId: null, tagName: null, text });
