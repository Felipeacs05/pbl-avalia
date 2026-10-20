// src/components/features/session-roles/SessionRolesPanel.tsx

// lista de papéis já ligada ao hook.
"use client";

import React from "react";
import { useSessionRoles } from "../../../hooks/useSessionRoles";
import type { SessionRoleStudent } from "../../../types/sessionRole";
import { SessionRoleList } from "./SessionRoleList";

interface SessionRolesPanelProps {
  sessionId: string;
  /** Alunos iniciais: só são lidos na montagem (use `key` para recarregar). */
  students: SessionRoleStudent[];
}

export function SessionRolesPanel({ sessionId, students }: SessionRolesPanelProps) {
  const { students: rows, error, assignRole } = useSessionRoles(sessionId, students);
  return <SessionRoleList students={rows} error={error} onAssignRole={assignRole} />;
}
