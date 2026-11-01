import type { SessionRole, SessionRoleAssignment, SessionRoleRow, SessionRoleStudent } from "@/types/sessionRole";

// Mesmos UUIDs dos testes de backend da US10 (e da US09 para sessão e alunos)
export const SESSION_ID = "777e7777-e77b-77d7-a777-777777777777";
export const ASSIGNMENT_ID = "222e2222-e22b-22d2-a222-222222222222";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "888e8888-e88b-88d8-a888-888888888888";

export const ROLE_TAKEN_MESSAGE = /este papel já foi atribuído a outro aluno nesta sessão/i;
export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode atribuir papéis da sessão/i;
export const EXTRA_GRADE_VALIDATION_MESSAGE = /nota extra deve estar entre 0 e 10/i;

// Textos completos usados pelos mocks: os mesmos do backend
export const ROLE_TAKEN_TEXT = "Este papel já foi atribuído a outro aluno nesta sessão.";
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode atribuir papéis da sessão.";

// Contrato de erro do service: { status, message }
export const makeRoleTakenError = () => ({ status: 422, message: ROLE_TAKEN_TEXT });

// Rótulos dos papéis, como escritos na US
export const ROLE_LABELS: Record<SessionRole, string> = {
  COORDINATOR: "Coordenador",
  BOARD_SECRETARY: "Secretário de Quadro",
  TABLE_SECRETARY: "Secretário de Mesa",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as SessionRole[];

export function makeStudent(overrides: Partial<SessionRoleStudent> = {}): SessionRoleStudent {
  return {
    id: STUDENT_ID,
    name: "Alice Souza",
    role: null,
    extraGrade: null,
    ...overrides,
  };
}

export const makeOtherStudent = (overrides: Partial<SessionRoleStudent> = {}): SessionRoleStudent =>
  makeStudent({
    id: OTHER_STUDENT_ID,
    name: "Bruno Lima",
    ...overrides,
  });

export function makeRow(student: SessionRoleStudent = makeStudent(), isSaving = false): SessionRoleRow {
  return { ...student, isSaving };
}

export function makeAssignment(overrides: Partial<SessionRoleAssignment> = {}): SessionRoleAssignment {
  return {
    id: ASSIGNMENT_ID,
    sessionId: SESSION_ID,
    studentId: STUDENT_ID,
    studentName: "Alice Souza",
    role: "COORDINATOR",
    extraGrade: 1.5,
    ...overrides,
  };
}
