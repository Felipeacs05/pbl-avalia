import type { Attendance, AttendanceRow, AttendanceStatus, SessionStudent } from "@/types/attendance";

// Mesmos UUIDs dos testes de backend da US09
export const SESSION_ID = "777e7777-e77b-77d7-a777-777777777777";
export const ATTENDANCE_ID = "333e3333-e33b-33d3-a333-333333333333";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "888e8888-e88b-88d8-a888-888888888888";

// 18:00 UTC = 15:00 em Brasília; 17:55 UTC = 14:55
export const RECORDED_AT = "2026-10-07T18:00:00Z";
export const RECORDED_AT_LABEL = /às 15:00/;
export const PREVIOUS_RECORDED_AT = "2026-10-07T17:55:00Z";
export const PREVIOUS_RECORDED_AT_LABEL = /às 14:55/;

export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode registrar a chamada/i;
export const TIMEOUT_MESSAGE = /tempo esgotado ao salvar a presença/i;

// Textos completos usados pelos mocks: o 403 é o mesmo texto do backend; o timeout é gerado pelo service
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode registrar a chamada.";
export const TIMEOUT_TEXT = "Tempo esgotado ao salvar a presença. Verifique sua conexão e tente novamente.";

// Contrato de erro do service: { status, message }; status 0 indica timeout
export const makeForbiddenError = () => ({ status: 403, message: FORBIDDEN_TEXT });
export const makeTimeoutError = () => ({ status: 0, message: TIMEOUT_TEXT });

// Rótulos dos botões, como escritos na US
export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Falta",
  LATE: "Atraso",
  JUSTIFIED_ABSENCE: "Falta Justificada",
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS) as AttendanceStatus[];

export function makeStudent(overrides: Partial<SessionStudent> = {}): SessionStudent {
  return {
    id: STUDENT_ID,
    name: "Alice Souza",
    status: null,
    recordedAt: null,
    ...overrides,
  };
}

export const makeOtherStudent = (overrides: Partial<SessionStudent> = {}): SessionStudent =>
  makeStudent({
    id: OTHER_STUDENT_ID,
    name: "Bruno Lima",
    ...overrides,
  });

export function makeRow(student: SessionStudent = makeStudent(), isSaving = false): AttendanceRow {
  return { ...student, isSaving };
}

export function makeAttendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: ATTENDANCE_ID,
    sessionId: SESSION_ID,
    studentId: STUDENT_ID,
    studentName: "Alice Souza",
    status: "PRESENT",
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}
