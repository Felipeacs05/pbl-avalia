// src/types/report.ts
// Relatório final da sala (US20), no mesmo formato do ClassReportResponse do backend.

// Problema como coluna do relatório, na ordem de criação; weight na escala do backend (0,4 = 40%)
export interface ProblemSummary {
  id: string;
  title: string;
  weight: number;
}

// Aluno ativo: notas indexadas pelo id do problema e média ponderada já calculada pelo backend
export interface StudentReportRow {
  studentId: string;
  studentName: string;
  gradesByProblem: Record<string, number>;
  weightedAverage: number | null; // null quando não há peso válido para dividir
  pendingProblemIds: string[];
}

// Aluno que trancou ou cancelou o vínculo: aparece à parte, com a média parcial
export interface WithdrawnStudentRow {
  studentId: string;
  studentName: string;
  unlinkedAt: string | null;
  gradesByProblem: Record<string, number>;
  partialAverage: number | null;
}

// Dado desconsiderado no cálculo (ex.: peso inválido); a tela mostra o message como chega
export interface ReportWarning {
  code: string;
  problemId: string | null;
  studentId: string | null;
  message: string;
}

export interface ClassReport {
  roomId: string;
  roomName: string;
  problems: ProblemSummary[];
  students: StudentReportRow[];
  openProblemIds: string[]; // problemas ainda não concluídos
  withdrawnStudents: WithdrawnStudentRow[];
  warnings: ReportWarning[];
}
