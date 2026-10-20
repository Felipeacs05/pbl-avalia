// src/components/features/attendance/AttendancePanel.tsx
"use client";

import React from "react";
import { useAttendance } from "../../../hooks/useAttendance";
import type { SessionStudent } from "../../../types/attendance";
import { AttendanceList } from "./AttendanceList";
import type { SessionRole } from "../../../types/sessionRole";
import type { StudentRoleState } from "./AttendanceStudentRow";

interface AttendancePanelProps {
  sessionId: string;
  /** Alunos iniciais da sessão: só são lidos na montagem (use `key` para recarregar). */
  students: SessionStudent[];
  roles?: Record<string, StudentRoleState>;
  onSaveRole?: (studentId: string, role: SessionRole | null, extraGrade: number | null) => void;
}

export function AttendancePanel({ sessionId, students, roles, onSaveRole }: AttendancePanelProps) {
  const { students: rows, error, changeStatus, updateTags } = useAttendance(
    sessionId,
    students,
  );

  return (
    <AttendanceList
      students={rows}
      error={error}
      roles={roles}
      onChangeStatus={changeStatus}
      onSaveRole={onSaveRole}
      onUpdateTags={updateTags}
    />
  );
}