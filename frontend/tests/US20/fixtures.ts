import type {
  ClassReport,
  ProblemSummary,
  ReportWarning,
  StudentReportRow,
  WithdrawnStudentRow,
} from "@/types/report";

// Os testes de backend da US20 usam UUIDs aleatórios; aqui ficam fixos, com sala, problemas e alunos herdados das US anteriores
export const TUTOR_ID = "123e4567-e89b-12d3-a456-426614174000";
export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const PROBLEM_ID = "555e5555-e55b-55d5-a555-555555555555";
export const OTHER_PROBLEM_ID = "666e6666-e66b-66d6-a666-666666666666";
export const OPEN_PROBLEM_ID = "203e2020-e20b-20d2-a020-202020202020";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "456e4567-e45b-45d4-a456-456745674567";
export const WITHDRAWN_STUDENT_ID = "202e2020-e20b-20d2-a020-202020202020";

// Mesmos nomes dos testes de backend da US20
export const ROOM_NAME = "Módulo PBL 1";
export const STUDENT_NAME = "Aluno A";
export const OTHER_STUDENT_NAME = "Aluno B";
export const WITHDRAWN_STUDENT_NAME = "Ex-Aluno";

// Massa da subtarefa [QA]: 8 no Problema 1 (peso 40%) e 7 no Problema 2 (peso 60%)
// Cálculo manual: 8 × 0,4 + 7 × 0,6 = 3,2 + 4,2 = 7,4 (a média simples daria 7,5)
export const QA_GRADE_P1 = 8;
export const QA_GRADE_P2 = 7;
export const QA_WEIGHT_P1 = 0.4;
export const QA_WEIGHT_P2 = 0.6;
export const QA_WEIGHTED_AVERAGE = 7.4;
export const QA_WEIGHTED_AVERAGE_LABEL = "7,4";
export const QA_SIMPLE_AVERAGE_LABEL = "7,5";

// Célula sem nota e média ausente (problema sem nota, soma de pesos zero)
export const EMPTY_VALUE_LABEL = "—";
export const OPEN_PROBLEM_LABEL = /em andamento/i;

// Textos completos usados pelos mocks; nas asserções, as regex
// O backend da US20 não fixa o texto do ReportWarning: a tela exibe o campo message como chega
export const INVALID_WEIGHT_WARNING_TEXT = "Peso inválido no Problema 3: o problema foi desconsiderado no cálculo.";
export const INVALID_WEIGHT_WARNING_MESSAGE = /peso inválido no problema 3/i;
// O 403 do @PreAuthorize vem com mensagem genérica em inglês; a interface mostra esta, em português
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode emitir o relatório final.";
export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode emitir o relatório final/i;
export const BACKEND_FORBIDDEN_BODY = {
  timestamp: "2026-10-20T10:00:00",
  status: 403,
  error: "Forbidden",
  message: "You do not have permission to perform this operation",
};

// Contrato de erro do service: { status, message }
export const makeForbiddenError = () => ({ status: 403, message: FORBIDDEN_TEXT });

// Problemas como o backend devolve (ProblemSummary), em ordem de criação; pesos na escala do backend
export function makeProblem(overrides: Partial<ProblemSummary> = {}): ProblemSummary {
  return { id: PROBLEM_ID, title: "Problema 1", weight: QA_WEIGHT_P1, ...overrides };
}

export const makeOtherProblem = (): ProblemSummary =>
  makeProblem({ id: OTHER_PROBLEM_ID, title: "Problema 2", weight: QA_WEIGHT_P2 });

// Problema ainda não concluído: entra em openProblemIds e não tem nota de ninguém
export const makeOpenProblem = (): ProblemSummary =>
  makeProblem({ id: OPEN_PROBLEM_ID, title: "Problema 3", weight: 1 });

// Aluno X da subtarefa [QA]; gradesByProblem é indexado pelo id do problema
export function makeStudentRow(overrides: Partial<StudentReportRow> = {}): StudentReportRow {
  return {
    studentId: STUDENT_ID,
    studentName: STUDENT_NAME,
    gradesByProblem: { [PROBLEM_ID]: QA_GRADE_P1, [OTHER_PROBLEM_ID]: QA_GRADE_P2 },
    weightedAverage: QA_WEIGHTED_AVERAGE,
    pendingProblemIds: [],
    ...overrides,
  };
}

// Valores distintos dos do Aluno A e chaves fora da ordem das colunas: a nota precisa cair na coluna pelo id
// Média coerente com os pesos: 9 × 0,4 + 5,5 × 0,6 = 6,9
export const makeOtherStudentRow = (): StudentReportRow =>
  makeStudentRow({
    studentId: OTHER_STUDENT_ID,
    studentName: OTHER_STUDENT_NAME,
    gradesByProblem: { [OTHER_PROBLEM_ID]: 5.5, [PROBLEM_ID]: 9 },
    weightedAverage: 6.9,
  });

// Aluno que trancou no meio do semestre, com média parcial calculada pelo backend
// 3 × 0,4 + 4 × 0,6 = 3,6: diferente de cada nota e da média simples (3,5), para provar a origem do valor
export function makeWithdrawnStudentRow(overrides: Partial<WithdrawnStudentRow> = {}): WithdrawnStudentRow {
  return {
    studentId: WITHDRAWN_STUDENT_ID,
    studentName: WITHDRAWN_STUDENT_NAME,
    unlinkedAt: "2026-05-10T13:00:00Z",
    gradesByProblem: { [PROBLEM_ID]: 3, [OTHER_PROBLEM_ID]: 4 },
    partialAverage: 3.6,
    ...overrides,
  };
}

export function makeInvalidWeightWarning(overrides: Partial<ReportWarning> = {}): ReportWarning {
  return {
    code: "INVALID_WEIGHT",
    problemId: OPEN_PROBLEM_ID,
    studentId: null,
    message: INVALID_WEIGHT_WARNING_TEXT,
    ...overrides,
  };
}

// Relatório como o backend devolve (ClassReportResponse campo a campo)
export function makeClassReport(overrides: Partial<ClassReport> = {}): ClassReport {
  return {
    roomId: ROOM_ID,
    roomName: ROOM_NAME,
    problems: [makeProblem(), makeOtherProblem()],
    students: [makeStudentRow(), makeOtherStudentRow()],
    openProblemIds: [],
    withdrawnStudents: [],
    warnings: [],
    ...overrides,
  };
}
