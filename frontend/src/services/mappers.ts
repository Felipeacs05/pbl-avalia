// src/services/mappers.ts
import axios from "axios";
import type { Room } from "../types/room";
import type { StudentRoom } from "../types/studentRoom";
import type { Discipline, Problem } from "../types/discipline";
import type { ProblemDetails, Session, SessionStatus } from "../types/problem";
import type { Group, Student as GroupStudent } from "../types/group";
import type { Student } from "../types/student";
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import type { Criterion, PerformanceTable } from "../types/performanceTable";
import type { GradeAdjustment } from "../types/gradeAdjustment";

export interface NormalizedApiError {
  status: number;
  message: string;
}

/**
 * Retorna os headers HTTP injetando `Authorization: Bearer <token>` quando houver
 * token salvo no `localStorage`. Quando não há token (ex.: testes unitários),
 * preserva exatamente o objeto `baseHeaders` sem chaves extras.
 */
export function getAuthHeaders(
  baseHeaders: Record<string, string> = { "Content-Type": "application/json" }
): Record<string, string> {
  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage?.getItem("token");
      if (token && token.trim().length > 0) {
        return {
          ...baseHeaders,
          Authorization: `Bearer ${token.trim()}`,
        };
      }
    } catch {
      // Ignora indisponibilidade de localStorage
    }
  }
  return { ...baseHeaders };
}

/**
 * Decodifica o campo `sub` (UUID do usuário logado) do JWT salvo no `localStorage`.
 */
export function getCurrentUserIdFromToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage?.getItem("token");
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = window.atob(base64);
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === "string" && payload.sub.trim() ? payload.sub.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Normaliza erros vindos do Axios, Fetch ou objetos `{ status, message }`
 * para o formato padronizado do frontend.
 */
export function normalizeApiError(
  error: unknown,
  fallbackMessage = "Ocorreu um erro inesperado na comunicação com o servidor."
): NormalizedApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return {
      status: (error as { status: number }).status,
      message: (error as { message: string }).message || fallbackMessage,
    };
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        status: 0,
        message: "Tempo esgotado na requisição. Verifique sua conexão e tente novamente.",
      };
    }

    if (error.response) {
      const { status, data } = error.response;
      if (typeof data === "string" && data.trim().length > 0) {
        return { status, message: data.trim() };
      }
      if (typeof data === "object" && data !== null) {
        const record = data as Record<string, unknown>;
        if (typeof record.errors === "object" && record.errors !== null) {
          const firstFieldError = Object.values(record.errors as Record<string, unknown>)[0];
          if (typeof firstFieldError === "string" && firstFieldError.trim().length > 0) {
            return { status, message: firstFieldError };
          }
        }
        if (typeof record.message === "string" && record.message.trim().length > 0) {
          return { status, message: record.message };
        }
        if (typeof record.error === "string" && record.error.trim().length > 0) {
          return { status, message: record.error };
        }
      }
      return { status, message: fallbackMessage };
    }

    return { status: 0, message: fallbackMessage };
  }

  if (error instanceof Error && error.message) {
    const status = (error as Error & { status?: number }).status ?? 0;
    return { status, message: error.message };
  }

  return { status: 0, message: fallbackMessage };
}

/**
 * Converte `RoomResponse` ou `RoomDto` do backend para `Room` do frontend.
 */
export function mapRoomFromApi(raw: Record<string, unknown>): Room {
  const code = String(raw.accessCode ?? raw.code ?? "");
  const joinLink = String(
    raw.inviteLink ?? raw.joinLink ?? (code ? `app/join/${code}` : "")
  );

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Sala sem nome"),
    code,
    joinLink,
    semester: typeof raw.semester === "string" && raw.semester ? raw.semester : "2026.2",
    tutor:
      typeof raw.tutorName === "string" && raw.tutorName
        ? raw.tutorName
        : typeof raw.tutor === "string" && raw.tutor
          ? raw.tutor
          : "Professor",
    tutorPhoto: typeof raw.tutorPhoto === "string" ? raw.tutorPhoto : undefined,
  };
}

/**
 * Converte `RoomResponse` ou `RoomDto` do backend para `StudentRoom` do frontend.
 */
export function mapStudentRoomFromApi(
  raw: Record<string, unknown>,
  fallbackCode = ""
): StudentRoom {
  const code = String(raw.accessCode ?? raw.code ?? fallbackCode);
  const inviteLink = String(
    raw.inviteLink ?? raw.joinLink ?? (code ? `app/join/${code}` : "")
  );

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? (code ? `Sala ${code}` : "Turma sem nome")),
    code,
    inviteLink,
    semester: typeof raw.semester === "string" && raw.semester ? raw.semester : "2026.2",
    tutor:
      typeof raw.tutorName === "string" && raw.tutorName
        ? raw.tutorName
        : typeof raw.tutor === "string" && raw.tutor
          ? raw.tutor
          : "Professor",
    tutorPhoto: typeof raw.tutorPhoto === "string" ? raw.tutorPhoto : undefined,
  };
}

/**
 * Converte `DashboardResponse` (`/api/v1/users/me/rooms`) para listas tipadas do frontend.
 */
export function mapDashboardFromApi(raw: Record<string, unknown>): {
  roomsAsTutor: Room[];
  roomsAsStudent: Room[];
} {
  const tutorList = Array.isArray(raw.roomsAsTutor) ? raw.roomsAsTutor : [];
  const studentList = Array.isArray(raw.roomsAsStudent) ? raw.roomsAsStudent : [];

  return {
    roomsAsTutor: tutorList.map((item) =>
      mapRoomFromApi((item ?? {}) as Record<string, unknown>)
    ),
    roomsAsStudent: studentList.map((item) =>
      mapRoomFromApi((item ?? {}) as Record<string, unknown>)
    ),
  };
}

/**
 * Converte `ProblemResponse` do backend para `Problem` do frontend.
 */
export function mapProblemFromApi(raw: Record<string, unknown>): Problem {
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    ...(typeof raw.description === "string" ? { description: raw.description } : {}),
  };
}

function mapSessionFromApi(
  raw: Record<string, unknown>,
  fallbackProblemId: string,
  index: number
): Session {
  const id = String(raw.id ?? `session_${index + 1}`);
  const problemId = String(raw.problemId ?? fallbackProblemId);
  const dateStr =
    typeof raw.date === "string"
      ? raw.date
      : typeof raw.sessionDate === "string"
        ? raw.sessionDate
        : new Date().toISOString().slice(0, 10);

  let displayDate = typeof raw.displayDate === "string" ? raw.displayDate : "Hoje";
  if (!raw.displayDate && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [, month, day] = dateStr.slice(0, 10).split("-");
    displayDate = `${day}/${month}`;
  }

  const rawStatus = String(raw.status ?? "in_progress");
  const status: SessionStatus =
    rawStatus === "self_evaluations_available" ||
    rawStatus === "no_pending_events" ||
    rawStatus === "in_progress" ||
    rawStatus === "completed"
      ? rawStatus
      : rawStatus.toUpperCase() === "CLOSED" || rawStatus.toUpperCase() === "COMPLETED"
        ? "completed"
        : "in_progress";

  const statusLabel =
    typeof raw.statusLabel === "string"
      ? raw.statusLabel
      : status === "completed"
        ? "Sessão Finalizada"
        : "Sessão em Andamento";

  return {
    id,
    problemId,
    date: dateStr,
    displayDate,
    status,
    statusLabel,
  };
}

/**
 * Converte `ProblemResponse` do backend para `ProblemDetails` do frontend.
 */
export function mapProblemDetailsFromApi(
  raw: Record<string, unknown>,
  sessionsRaw?: unknown[]
): ProblemDetails {
  const id = String(raw.id ?? "");
  const title = String(raw.title ?? "Problema");
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description
      : "Problema cadastrado na sala tutorial.";
  const disciplineCode =
    typeof raw.disciplineCode === "string" && raw.disciplineCode
      ? raw.disciplineCode
      : "PBL";
  const semester =
    typeof raw.semester === "string" && raw.semester ? raw.semester : "2026.2";

  const rawList = Array.isArray(sessionsRaw)
    ? sessionsRaw
    : Array.isArray(raw.sessions)
      ? raw.sessions
      : [];

  const sessions: Session[] = rawList.map((s, idx) =>
    mapSessionFromApi((s ?? {}) as Record<string, unknown>, id, idx)
  );

  return {
    id,
    title,
    description,
    disciplineCode,
    semester,
    sessions,
  };
}

/**
 * Constrói o objeto `Discipline` esperado pelas telas de sala/disciplina
 * a partir da `Room` real e da lista real de `Problem`s do backend.
 */
export function mapDisciplineFromRoomAndProblems(
  room: Room | StudentRoom | null | undefined,
  roomId: string,
  problems: Problem[]
): Discipline {
  return {
    id: roomId,
    roomId,
    name: room?.name || "Sala Tutorial PBL",
    description: room?.tutor
      ? `Tutoria conduzida por ${room.tutor}`
      : "Ambiente de Aprendizagem Baseada em Problemas (PBL)",
    problems,
  };
}

/**
 * Converte `GroupMemberResponse` (`{ id, name }` ou `{ userId, userName }`) para `Student`.
 */
export function mapGroupMemberFromApi(raw: Record<string, unknown>): GroupStudent {
  return {
    id: String(raw.id ?? raw.userId ?? ""),
    name: String(raw.name ?? raw.userName ?? "Aluno"),
  };
}

/**
 * Converte `GroupResponse` do backend para `Group` do frontend.
 */
export function mapGroupFromApi(raw: Record<string, unknown>): Group {
  const membersRaw = Array.isArray(raw.members) ? raw.members : [];
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    ...(raw.roomId ? { roomId: String(raw.roomId) } : {}),
    members: membersRaw.map((m) =>
      mapGroupMemberFromApi((m ?? {}) as Record<string, unknown>)
    ),
  };
}

/**
 * Converte `ClassRosterDTO` do backend para `Student` do carômetro.
 */
export function mapRosterStudentFromApi(raw: Record<string, unknown>): Student {
  const profileImageUrl =
    typeof raw.profileImageUrl === "string"
      ? raw.profileImageUrl
      : typeof raw.profilePictureUrl === "string"
        ? raw.profilePictureUrl
        : null;

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    avatarUrl: profileImageUrl ?? (typeof raw.avatarUrl === "string" ? raw.avatarUrl : ""),
    profileImageUrl,
    initials: typeof raw.initials === "string" ? raw.initials : undefined,
  };
}

/**
 * Converte status de liberação de avaliação do backend para `EvaluationStatus`.
 */
export function mapEvaluationStatusFromApi(
  problemId: string,
  raw: Record<string, unknown>
): EvaluationStatus {
  if ("activeType" in raw && "isReleased" in raw) {
    return {
      problemId: String(raw.problemId ?? problemId),
      activeType: (raw.activeType as EvaluationType) ?? null,
      isReleased: Boolean(raw.isReleased),
      ...(typeof raw.releasedAt === "string" ? { releasedAt: raw.releasedAt } : {}),
    };
  }

  const selfOpen = Boolean(raw.selfEvaluationOpen ?? raw.selfAssessmentReleased);
  const peerOpen = Boolean(raw.peerEvaluationOpen ?? raw.peerAssessmentReleased);
  const activeType: EvaluationType = selfOpen
    ? "self_evaluation"
    : peerOpen
      ? "peer_evaluation"
      : null;

  return {
    problemId,
    activeType,
    isReleased: activeType !== null,
  };
}

/**
 * Converte `PerformanceTableResponse` do backend para `PerformanceTable`.
 */
export function mapPerformanceTableFromApi(
  raw: Record<string, unknown>
): PerformanceTable {
  const criteriaRaw = Array.isArray(raw.criteriaList) ? raw.criteriaList : [];
  const criteriaList: Criterion[] = criteriaRaw.map((item) => {
    const c = (item ?? {}) as Record<string, unknown>;
    return {
      criterionId: String(c.criterionId ?? c.id ?? ""),
      criteriaName: String(c.criteriaName ?? c.name ?? ""),
      criteriaDescription:
        typeof c.criteriaDescription === "string"
          ? c.criteriaDescription
          : typeof c.description === "string"
            ? c.description
            : undefined,
      criteriaWeight: Number(c.criteriaWeight ?? c.weight ?? 0),
      status: typeof c.status === "string" ? c.status : "ACTIVE",
    };
  });

  return {
    performanceTableId: String(raw.performanceTableId ?? raw.id ?? ""),
    roomId: String(raw.roomId ?? ""),
    tableName: String(raw.tableName ?? raw.name ?? "Tabela de Desempenho"),
    status: String(raw.status ?? "ACTIVE"),
    criteriaList,
  };
}

/**
 * Converte `GradeAdjustmentResponse` do backend para `GradeAdjustment`.
 */
export function mapGradeAdjustmentFromApi(
  raw: Record<string, unknown>
): GradeAdjustment {
  const originalGrade = Number(raw.originalGrade ?? raw.nota_original ?? 0);
  const adjustedGrade = Number(raw.adjustedGrade ?? raw.score ?? originalGrade);
  const modifiedByTutor = Boolean(raw.modifiedByTutor ?? raw.ajustado_por_tutor ?? true);

  return {
    assessmentId: String(raw.assessmentId ?? raw.id ?? ""),
    originalGrade,
    adjustedGrade,
    justification: String(raw.justification ?? ""),
    modifiedByTutor,
    ajustado_por_tutor: modifiedByTutor,
    nota_original: originalGrade,
  };
}
