import type { StudentFeedback } from "@/types/feedback";

// Os testes de backend da US17 usam UUIDs aleatórios; aqui ficam fixos, com os alunos herdados das US anteriores
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "456e4567-e45b-45d4-a456-456745674567";

// Mesmo tutor e mesmos valores dos testes de backend da US17
export const TUTOR_NAME = "Prof. Ana Souza";

// 01:30 UTC de 02/10 = 22:30 de 01/10 em Brasília: a data exibida precisa ser a do fuso de Brasília
export const CREATED_AT = "2026-10-02T01:30:00Z";
export const CREATED_AT_LABEL = /01\/10\/2026/;
export const CREATED_AT_UTC_LABEL = /02\/10\/2026/;
export const OLDER_CREATED_AT = "2026-09-20T15:00:00Z";

// Textos completos usados pelos mocks; nas asserções, as regex
// O 403 do @PreAuthorize vem com mensagem genérica em inglês; a interface mostra esta, em português
export const FORBIDDEN_TEXT = "Você só pode ver os seus próprios feedbacks.";
export const FORBIDDEN_MESSAGE = /você só pode ver os seus próprios feedbacks/i;
export const BACKEND_FORBIDDEN_BODY = {
  timestamp: "2026-10-18T10:00:00",
  status: 403,
  error: "Forbidden",
  message: "You do not have permission to perform this operation",
};
export const EMPTY_MESSAGE = /você ainda não recebeu feedbacks/i;

// Contrato de erro do service: { status, message }
export const makeForbiddenError = () => ({ status: 403, message: FORBIDDEN_TEXT });

// Feedback como o backend devolve (FeedbackDTO): só os 5 campos públicos, sem ids, e-mail ou senha
export function makeStudentFeedback(overrides: Partial<StudentFeedback> = {}): StudentFeedback {
  return {
    tutorName: TUTOR_NAME,
    problemTitle: "Problema 1",
    grade: 8.5,
    text: "Excelente participação nas sessões",
    createdAt: CREATED_AT,
    ...overrides,
  };
}

// Feedback mais antigo de outro problema: a lista precisa manter a ordem do backend (mais recente primeiro)
export const makeOlderStudentFeedback = (): StudentFeedback =>
  makeStudentFeedback({
    problemTitle: "Problema 2",
    grade: 7,
    text: "Precisa participar mais da discussão",
    createdAt: OLDER_CREATED_AT,
  });

// Página como o backend devolve (PageResponse)
export function makePage(content: StudentFeedback[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1 };
}
