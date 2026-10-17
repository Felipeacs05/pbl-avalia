// src/components/features/attendance/AttendanceList.tsx
"use client";

import React, { useMemo } from "react";
import type { AttendanceRow, AttendanceStatus } from "../../../types/attendance";
import { AttendanceStudentRow } from "./AttendanceStudentRow";
import type { OccupiedRoleInfo } from "./AssignRoleModal";

interface AttendanceListProps {
  students: AttendanceRow[];
  error: string | null;
  onChangeStatus: (studentId: string, status: AttendanceStatus) => Promise<void>;
  onAssignRole?: (studentId: string, role: string | undefined) => void;
  onUpdateTags?: (studentId: string, tags: string[]) => void;
}

export function AttendanceList({
  students,
  error,
  onChangeStatus,
  onAssignRole,
  onUpdateTags,
}: AttendanceListProps) {
  // Mapeamento de papéis ocupados na sessão para garantir a unicidade de papéis (PBL)
  const occupiedRoles = useMemo(() => {
    const map: Record<string, OccupiedRoleInfo> = {};
    students.forEach((s) => {
      if (s.role) {
        const normalized = s.role.toLowerCase().startsWith("coordenad")
          ? "Coordenador"
          : s.role.toLowerCase().startsWith("quadr")
          ? "Quadro"
          : s.role.toLowerCase().startsWith("mes")
          ? "Mesa"
          : s.role;
        map[normalized] = { studentId: s.id, studentName: s.name };
      }
    });
    return map;
  }, [students]);

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
              occupiedRoles={occupiedRoles}
              onChangeStatus={onChangeStatus}
              onAssignRole={onAssignRole}
              onUpdateTags={onUpdateTags}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
