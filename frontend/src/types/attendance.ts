// src/types/attendance.ts

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "JUSTIFIED_ABSENCE";

/** Registro de chamada devolvido pelo servidor (o horário é sempre do servidor). */
export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  recordedAt: string;
}

/** Aluno da sessão com o último status salvo (null = chamada ainda não feita). */
export interface SessionStudent {
  id: string;
  name: string;
  status: AttendanceStatus | null;
  recordedAt: string | null;
  avatarUrl?: string;
  role?: string;
  tags?: string[];
}

/** Linha da lista: o aluno + se existe salvamento em andamento para ele. */
export interface AttendanceRow extends SessionStudent {
  isSaving: boolean;
}

/** Contrato de erro do service: status 0 indica timeout / falha de rede. */
export interface AttendanceRequestError {
  status: number;
  message: string;
}
