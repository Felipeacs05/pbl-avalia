// src/components/features/session-roles/sessionRoleOptions.ts

// Rótulos, cores e conversões dos papéis da sessão, usados pela chamada e pela lista de papéis.
import type { SessionStudent } from "../../../types/attendance";
import type { SessionRole, SessionRoleStudent } from "../../../types/sessionRole";

/** Rótulos dos papéis, como escritos na US. */
export const SESSION_ROLE_LABELS: Record<SessionRole, string> = {
  COORDINATOR: "Coordenador",
  BOARD_SECRETARY: "Secretário de Quadro",
  TABLE_SECRETARY: "Secretário de Mesa",
};

export const SESSION_ROLES = Object.keys(SESSION_ROLE_LABELS) as SessionRole[];

/** Cor de cada papel: fundo da badge e borda de destaque da linha do aluno. */
export const SESSION_ROLE_STYLES: Record<SessionRole, { badge: string; border: string }> = {
  COORDINATOR: { badge: "bg-amber-300 text-amber-950", border: "border-amber-400" },
  BOARD_SECRETARY: { badge: "bg-emerald-300 text-emerald-950", border: "border-emerald-400" },
  TABLE_SECRETARY: { badge: "bg-sky-300 text-sky-950", border: "border-sky-400" },
};

/**
 * Converte o papel vindo do roster para o enum da US10.
 * Aceita o enum do backend e os nomes antigos em português ("Coordenador", "Quadro", "Mesa").
 */
export function toSessionRole(value: string | null | undefined): SessionRole | null {
  if (!value) return null;
  if ((SESSION_ROLES as string[]).includes(value)) return value as SessionRole;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("coordenad")) return "COORDINATOR";
  if (normalized.includes("quadro")) return "BOARD_SECRETARY";
  if (normalized.includes("mesa")) return "TABLE_SECRETARY";
  return null;
}

/** Aluno da chamada (roster) -> aluno da lista de papéis. */
export function toSessionRoleStudent(student: SessionStudent): SessionRoleStudent {
  return {
    id: student.id,
    name: student.name,
    role: toSessionRole(student.role),
    extraGrade: student.extraGrade ?? null,
  };
}
