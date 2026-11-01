// src/types/sessionRole.ts

// Atribuição de Papéis da Sessão, no mesmo formato do backend.

/** Papéis da sessão tutorial (PBL). Cada papel fica com no máximo um aluno por sessão. */
export type SessionRole = "COORDINATOR" | "BOARD_SECRETARY" | "TABLE_SECRETARY";

/** Aluno da sessão com o papel atual (null = sem papel) e a nota extra pelo papel. */
export interface SessionRoleStudent {
  id: string;
  name: string;
  role: SessionRole | null;
  extraGrade: number | null;
}

/** Linha da lista: o aluno + se existe salvamento em andamento para ele. */
export interface SessionRoleRow extends SessionRoleStudent {
  isSaving: boolean;
}

/** Atribuição devolvida pelo backend no PUT /api/v1/sessions/{sessionId}/roles/{role}. */
export interface SessionRoleAssignment {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  role: SessionRole;
  extraGrade: number;
}

/** Contrato de erro do service: status 0 indica falha de rede. */
export interface SessionRoleRequestError {
  status: number;
  message: string;
}
