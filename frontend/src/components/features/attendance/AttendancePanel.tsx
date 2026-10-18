// src/components/features/attendance/AttendancePanel.tsx
"use client";

import React from "react";
import { useAttendance } from "../../../hooks/useAttendance";
import type { SessionStudent } from "../../../types/attendance";
import { AttendanceList } from "./AttendanceList";

interface AttendancePanelProps {
  sessionId: string;
  /** Alunos iniciais da sessão: só são lidos na montagem (use `key` para recarregar). */
  students: SessionStudent[];
}

export function AttendancePanel({ sessionId, students }: AttendancePanelProps) {
  const { students: rows, error, changeStatus, assignRole, updateTags } = useAttendance(
    sessionId,
    students,
  );

  return (
    <AttendanceList
      students={rows}
      error={error}
      onChangeStatus={changeStatus}
      onAssignRole={assignRole}
      onUpdateTags={updateTags}
    />
  );
}
