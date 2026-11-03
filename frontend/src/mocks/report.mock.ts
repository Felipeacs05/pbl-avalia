// src/mocks/report.mock.ts
// Simula o GET /api/v1/rooms/{roomId}/reports/final enquanto o endpoint não existe.
// As colunas saem dos problemas que o professor cadastrou na sala (gradeMock), então criar ou
// excluir um problema muda a quantidade de colunas. Problema com sessão em andamento fica "em andamento".
import type { ClassReport, StudentReportRow, WithdrawnStudentRow } from "../types/report";
import { gradeMock } from "./grade.mock";
import { problemDetailsMock } from "./problem.mock";
import { roomsMock } from "./rooms.mock";

const MOCK_STUDENTS = [
  { id: "stu_ana", name: "Ana Beatriz Souza" },
  { id: "stu_bruno", name: "Bruno Lima" },
  { id: "stu_carla", name: "Carla Mendes" },
];
const MOCK_WITHDRAWN = { id: "stu_diego", name: "Diego Ramos", unlinkedAt: "2026-05-10T13:00:00Z" };

// Nota fixa por aluno e problema (sem aleatório, para a tela não mudar a cada visita)
function mockGrade(studentIndex: number, problemIndex: number): number {
  return [8, 6.5, 9, 7, 5.5, 10][(studentIndex * 2 + problemIndex) % 6];
}

function weightedAverage(grades: Record<string, number>, weights: Record<string, number>): number | null {
  const ids = Object.keys(grades).filter((id) => id in weights);
  const totalWeight = ids.reduce((sum, id) => sum + weights[id], 0);
  if (totalWeight === 0) return null;
  return ids.reduce((sum, id) => sum + grades[id] * weights[id], 0) / totalWeight;
}

export function buildClassReportMock(roomId: string): ClassReport {
  const room = roomsMock.find((r) => r.id === roomId);
  const problems = gradeMock
    .filter((d) => d.roomId === roomId)
    // O nome da disciplina entra no título: duas disciplinas podem ter um "Problema 1"
    .flatMap((d) => d.problems.map((p) => ({ ...p, title: `${p.title} (${d.name})` })))
    .map((p, _, all) => ({ id: p.id, title: p.title, weight: 1 / all.length }));

  const openProblemIds = problems
    .filter((p) => problemDetailsMock[p.id]?.sessions.some((s) => s.status === "in_progress"))
    .map((p) => p.id);
  // Só problemas concluídos têm nota e entram na média
  const closed = problems.filter((p) => !openProblemIds.includes(p.id));
  const weights = Object.fromEntries(closed.map((p) => [p.id, p.weight]));

  const gradesOf = (studentIndex: number) =>
    Object.fromEntries(closed.map((p, problemIndex) => [p.id, mockGrade(studentIndex, problemIndex)]));

  const students: StudentReportRow[] = MOCK_STUDENTS.map((student, index) => {
    // O último aluno ainda não tem nota no último problema: célula "—"
    const grades = gradesOf(index);
    if (index === MOCK_STUDENTS.length - 1 && closed.length > 1) delete grades[closed[closed.length - 1].id];
    return {
      studentId: student.id,
      studentName: student.name,
      gradesByProblem: grades,
      weightedAverage: weightedAverage(grades, weights),
      pendingProblemIds: closed.filter((p) => !(p.id in grades)).map((p) => p.id),
    };
  });

  const withdrawnGrades = closed.length > 0 ? { [closed[0].id]: 4 } : {};
  const withdrawnStudents: WithdrawnStudentRow[] =
    closed.length > 0
      ? [
          {
            studentId: MOCK_WITHDRAWN.id,
            studentName: MOCK_WITHDRAWN.name,
            unlinkedAt: MOCK_WITHDRAWN.unlinkedAt,
            gradesByProblem: withdrawnGrades,
            partialAverage: weightedAverage(withdrawnGrades, weights),
          },
        ]
      : [];

  return {
    roomId,
    roomName: room?.name ?? "Sala",
    problems,
    students,
    openProblemIds,
    withdrawnStudents,
    warnings: [],
  };
}
