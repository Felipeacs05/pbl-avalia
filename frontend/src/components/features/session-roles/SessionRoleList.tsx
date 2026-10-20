// src/components/features/session-roles/SessionRoleList.tsx

// lista de alunos com o seletor de papel, a nota extra e o botão "Atribuir" em cada linha.
// Quando o aluno tem papel, a linha ganha a badge e a borda na cor do papel (na hora, sem esperar o backend).
"use client";

import React from "react";
import type { SessionRole, SessionRoleRow } from "../../../types/sessionRole";
import { SessionRoleBadge } from "./SessionRoleBadge";
import { SessionRoleForm } from "./SessionRoleForm";
import { SESSION_ROLE_STYLES } from "./sessionRoleOptions";

interface SessionRoleListProps {
  students: SessionRoleRow[];
  /** Recusa do backend (422, 403...). Fica acima da lista, sem escondê-la. */
  error: string | null;
  onAssignRole: (studentId: string, role: SessionRole, extraGrade: number) => Promise<void>;
}

export function SessionRoleList({ students, error, onAssignRole }: SessionRoleListProps) {
  return (
    <div className="w-full flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500 px-1">
        Cada papel fica com apenas um aluno por sessão. A nota extra vai de 0 a 10.
      </p>

      {students.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">Nenhum aluno nesta sessão.</p>
      ) : (
        <ul role="list" className="w-full flex flex-col gap-3 list-none p-0 m-0">
          {students.map((student) => (
            <li
              key={student.id}
              aria-busy={student.isSaving}
              className={`w-full rounded-2xl border-2 bg-white p-3.5 shadow-sm transition-colors ${
                student.role ? SESSION_ROLE_STYLES[student.role].border : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{student.name}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {student.isSaving && <span className="text-[11px] text-gray-400">Salvando…</span>}
                  {student.role && <SessionRoleBadge role={student.role} />}
                </div>
              </div>

              <SessionRoleForm
                initialRole={student.role}
                initialExtraGrade={student.extraGrade}
                isSaving={student.isSaving}
                onSubmit={(role, extraGrade) => onAssignRole(student.id, role, extraGrade)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
