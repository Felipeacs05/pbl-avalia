// src/components/features/session-roles/SessionRoleIcon.tsx

// Ícone do botão de papel na linha da chamada: muda para o ícone do cargo atual.
import React from "react";
import { Crown, NotebookPen, Presentation, UserRound } from "lucide-react";
import type { SessionRole } from "../../../types/sessionRole";

const ROLE_ICONS: Record<SessionRole, typeof UserRound> = {
  COORDINATOR: Crown,           // conduz a sessão
  BOARD_SECRETARY: Presentation, // escreve no quadro
  TABLE_SECRETARY: NotebookPen,  // anota na mesa
};

interface SessionRoleIconProps {
  role: SessionRole | null;
  size?: number;
}

/** Sem papel: ícone de usuário comum. Com papel: ícone do cargo. */
export function SessionRoleIcon({ role, size = 20 }: SessionRoleIconProps) {
  const Icon = role ? ROLE_ICONS[role] : UserRound;
  return <Icon size={size} aria-hidden="true" />;
}
