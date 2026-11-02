import type { Feedback, FeedbackStudent } from "@/types/feedback";

// Os testes de backend da US16 usam UUIDs aleatórios; aqui ficam fixos, com problema e alunos herdados das US anteriores
export const PROBLEM_ID = "555e5555-e55b-55d5-a555-555555555555";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "456e4567-e45b-45d4-a456-456745674567";
export const FEEDBACK_ID = "161e1616-e16b-16d6-a616-161616161616";
export const OTHER_FEEDBACK_ID = "616e6161-e61b-61d6-a161-616161616161";

// Mesmo tamanho de turma do FeedbackIntegrationTest (lote que precisa terminar em menos de 2 s)
export const CLASS_SIZE = 40;

export const GRADE = 8.5;
export const TEXT = "Excelente participação nas sessões";

// Textos completos usados pelos mocks; nas asserções, as regex
// Mesma mensagem do @NotBlank do FeedbackRequest
export const TEXT_REQUIRED_TEXT = "O texto do feedback não pode ser vazio";
export const TEXT_REQUIRED_MESSAGE = /o texto do feedback não pode ser vazio/i;
// O 403 do backend vem com mensagem genérica em inglês; a interface mostra esta, em português
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode enviar feedbacks.";
export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode enviar feedbacks/i;
export const BACKEND_FORBIDDEN_BODY = {
  timestamp: "2026-10-18T10:00:00",
  status: 403,
  error: "Forbidden",
  message: "You do not have permission to perform this operation",
};
// 504 do gateway: o corpo não é JSON nem traz mensagem útil
export const TIMEOUT_TEXT = "O envio demorou demais e não foi concluído. Tente novamente.";
export const TIMEOUT_MESSAGE = /o envio demorou demais e não foi concluído/i;

// Contrato de erro do service: { status, message }
export const makeTextRequiredError = () => ({ status: 400, message: TEXT_REQUIRED_TEXT });
export const makeTimeoutError = () => ({ status: 504, message: TIMEOUT_TEXT });

export function makeStudent(overrides: Partial<FeedbackStudent> = {}): FeedbackStudent {
  return { id: STUDENT_ID, name: "Alice Souza", ...overrides };
}

export const makeOtherStudent = (): FeedbackStudent => makeStudent({ id: OTHER_STUDENT_ID, name: "Bruno Lima" });

// Ids distintos para uma sala cheia
export function makeClassIds(size = CLASS_SIZE): string[] {
  return Array.from({ length: size }, (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, "0")}`);
}

// Sala cheia como a tela recebe: os mesmos ids de makeClassIds, cada um com um nome
export function makeClassStudents(size = CLASS_SIZE): FeedbackStudent[] {
  return makeClassIds(size).map((id, i) => ({ id, name: `Aluno ${i + 1}` }));
}

// Feedback como o backend devolve (FeedbackResponse campo a campo)
export function makeFeedback(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: FEEDBACK_ID,
    problemId: PROBLEM_ID,
    studentId: STUDENT_ID,
    grade: GRADE,
    text: TEXT,
    ...overrides,
  };
}

export const makeOtherFeedback = (): Feedback =>
  makeFeedback({ id: OTHER_FEEDBACK_ID, studentId: OTHER_STUDENT_ID });
