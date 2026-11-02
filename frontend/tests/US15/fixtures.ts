import type { GradeAdjustment, SubmittedSelfAssessment } from "@/types/gradeAdjustment";

// Os testes de backend da US15 usam UUIDs aleatórios; aqui ficam fixos, com o aluno herdado das US anteriores
export const ASSESSMENT_ID = "151e1515-e15b-15d5-a515-151515151515";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";

// Mesmos valores do GradeAdjustmentControllerTest: nota 6.0 enviada pelo aluno e ajustada para 8.5
export const ORIGINAL_GRADE = 6.0;
export const ADJUSTED_GRADE = 8.5;
export const JUSTIFICATION = "Nota subestimada frente ao desempenho";

// Mesma mensagem do @NotBlank do GradeAdjustmentRequest
export const JUSTIFICATION_REQUIRED_MESSAGE = /justificativa é obrigatória/i;

// O 403 do backend vem com mensagem genérica em inglês; a interface mostra esta, em português
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode ajustar notas.";
export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode ajustar notas/i;
export const BACKEND_FORBIDDEN_BODY = {
  timestamp: "2026-10-18T10:00:00",
  status: 403,
  error: "Forbidden",
  message: "You do not have permission to perform this operation",
};

// Nome acessível do ícone exibido no painel do aluno
export const MODIFIED_BY_TUTOR_ICON = /nota modificada pelo tutor/i;

// Contrato de erro do service: { status, message }
export const makeForbiddenError = () => ({ status: 403, message: FORBIDDEN_TEXT });

// Autoavaliação como o tutor a analisa: a nota e o comentário enviados pelo aluno
export function makeSubmittedSelfAssessment(
  overrides: Partial<SubmittedSelfAssessment> = {},
): SubmittedSelfAssessment {
  return {
    id: ASSESSMENT_ID,
    studentId: STUDENT_ID,
    studentName: "Alice Souza",
    score: ORIGINAL_GRADE,
    comment: "Participei ativamente das sessões",
    modifiedByTutor: false,
    ...overrides,
  };
}

// Resposta do PATCH: GradeAdjustmentResponse campo a campo
export function makeGradeAdjustment(overrides: Partial<GradeAdjustment> = {}): GradeAdjustment {
  return {
    assessmentId: ASSESSMENT_ID,
    originalGrade: ORIGINAL_GRADE,
    adjustedGrade: ADJUSTED_GRADE,
    justification: JUSTIFICATION,
    modifiedByTutor: true,
    ...overrides,
  };
}
