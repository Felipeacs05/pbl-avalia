// src/components/features/attendance/AttendanceList.tsx
"use client";

import React, { useMemo } from "react";
import type { AttendanceRow, AttendanceStatus } from "../../../types/attendance";
import { AttendanceStudentRow, type StudentRoleState } from "./AttendanceStudentRow";
import type { OccupiedRoleInfo } from "./AssignRoleModal";
//  vêm do hook da US10
import type { SessionRole } from "../../../types/sessionRole";

interface AttendanceListProps {
  students: AttendanceRow[];
  error: string | null;
  /** Papel de cada aluno (id -> estado), vindo de useSessionRoles. */
  roles?: Record<string, StudentRoleState>;
  onChangeStatus: (studentId: string, status: AttendanceStatus) => Promise<void>;
  onSaveRole?: (studentId: string, role: SessionRole | null, extraGrade: number | null) => void;
  onUpdateTags?: (studentId: string, tags: string[]) => void;
}

export function AttendanceList({
  students,
  error,
  roles = {},
  onChangeStatus,
  onSaveRole,
  onUpdateTags,
}: AttendanceListProps) {
  // Quem está com cada papel (para "Ocupado por X" e o aviso de transferência)
  const occupiedRoles = useMemo(() => {
    const map: Partial<Record<SessionRole, OccupiedRoleInfo>> = {};
    students.forEach((s) => {
      const role = roles[s.id]?.role;
      if (role) map[role] = { studentId: s.id, studentName: s.name };
    });
    return map;
  }, [students, roles]);

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

      {students.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          Nenhum aluno nesta sessão.
        </p>
      ) : (
        <ul role="list" className="w-full flex flex-col gap-3 list-none p-0 m-0">
          {students.map((student) => (
            <AttendanceStudentRow
              key={student.id}
              student={student}
              roleState={roles[student.id]}
              occupiedRoles={occupiedRoles}
              onSaveRole={onSaveRole}
              onChangeStatus={onChangeStatus}
              onUpdateTags={onUpdateTags}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
