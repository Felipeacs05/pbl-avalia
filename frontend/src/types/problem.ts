// src/types/problem.ts

export type SessionStatus =
  | "self_evaluations_available"
  | "no_pending_events"
  | "in_progress"
  | "completed";

export interface Session {
  id: string;
  problemId: string;
  date: string;
  displayDate: string;
  status: SessionStatus;
  statusLabel: string;
}

export interface Problem {
  id: string;
  title: string;
}

export interface ProblemDetails {
  id: string;
  title: string;
  description?: string;
  disciplineCode: string;
  semester: string;
  sessions: Session[];
}
