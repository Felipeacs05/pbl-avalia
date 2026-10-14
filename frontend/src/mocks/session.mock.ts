// src/mocks/session.mock.ts
import type { Attendance, AttendanceStatus, SessionStudent } from "../types/attendance";
import type { SessionRoster } from "../types/session";

const MOCK_LATENCY_MS = 450;

const PORTRAIT_BASE_URL = "https://randomuser.me/api/portraits";

/** Alunos fictícios (nomes e fotos aleatórias) usados enquanto não há backend. */
function buildMockStudents(): SessionStudent[] {
  const now = new Date();
  const minutesAgo = (minutes: number) =>
    new Date(now.getTime() - minutes * 60_000).toISOString();

  return [
    {
      id: "stu_01",
      name: "Camila Rocha",
      role: "Coordenador",
      avatarUrl: `${PORTRAIT_BASE_URL}/women/44.jpg`,
      status: "PRESENT",
      recordedAt: minutesAgo(12),
    },
    {
      id: "stu_02",
      name: "Rafael Mendes",
      role: "Quadro",
      avatarUrl: `${PORTRAIT_BASE_URL}/men/32.jpg`,
      status: "PRESENT",
      recordedAt: minutesAgo(10),
    },
    {
      id: "stu_03",
      name: "Beatriz Lima",
      role: "Mesa",
      avatarUrl: `${PORTRAIT_BASE_URL}/women/68.jpg`,
      status: "PRESENT",
      recordedAt: minutesAgo(9),
    },
    {
      id: "stu_04",
      name: "Thiago Alves",
      avatarUrl: `${PORTRAIT_BASE_URL}/men/75.jpg`,
      status: "ABSENT",
      recordedAt: minutesAgo(5),
    },
    {
      id: "stu_05",
      name: "Larissa Gomes",
      avatarUrl: `${PORTRAIT_BASE_URL}/women/12.jpg`,
      status: "JUSTIFIED_ABSENCE",
      recordedAt: minutesAgo(4),
    },
  ];
}

// Estado em memória: recarregar a página (F5) restaura a chamada inicial.
const attendanceByKey = new Map<string, Attendance>();
const studentsByKey = new Map<string, SessionStudent>();

const keyOf = (sessionId: string, studentId: string) => `${sessionId}:${studentId}`;

function wait<T>(value: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value()), MOCK_LATENCY_MS));
}

export const sessionMock = {
  fetchRoster(sessionId: string): Promise<SessionRoster> {
    return wait(() => {
      const students = buildMockStudents().map((student) => {
        const saved = attendanceByKey.get(keyOf(sessionId, student.id));
        return saved
          ? { ...student, status: saved.status, recordedAt: saved.recordedAt }
          : student;
      });
      students.forEach((student) => studentsByKey.set(keyOf(sessionId, student.id), student));
      return { id: sessionId, date: new Date().toISOString(), students };
    });
  },

  registerAttendance(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
  ): Promise<Attendance> {
    return wait(() => {
      const key = keyOf(sessionId, studentId);
      const existing = attendanceByKey.get(key);
      const student = studentsByKey.get(key);
      // O horário é do "servidor": reenviar o mesmo status mantém o horário original.
      const saved: Attendance = {
        id: existing?.id ?? `att_${sessionId}_${studentId}`,
        sessionId,
        studentId,
        studentName: student?.name ?? "",
        status,
        recordedAt:
          existing && existing.status === status
            ? existing.recordedAt
            : new Date().toISOString(),
      };
      attendanceByKey.set(key, saved);
      return saved;
    });
  },

  reset(): void {
    attendanceByKey.clear();
    studentsByKey.clear();
  },
};
