// src/components/features/attendance/attendanceStatusOptions.tsx
import React from "react";
import { CircleCheck, Clock, Hand, UserX } from "lucide-react";
import type { AttendanceStatus } from "../../../types/attendance";

export interface AttendanceStatusOption {
  status: AttendanceStatus;
  /** Nome exato do botão (a lista de status é a mesma da US09). */
  label: string;
  icon: React.ReactNode;
}

// A palma (Presente) fica por último, no canto direito, como no Figma.
export const ATTENDANCE_STATUS_OPTIONS: AttendanceStatusOption[] = [
  { status: "ABSENT", label: "Falta", icon: <UserX size={20} aria-hidden="true" /> },
  { status: "LATE", label: "Atraso", icon: <Clock size={20} aria-hidden="true" /> },
  {
    status: "JUSTIFIED_ABSENCE",
    label: "Falta Justificada",
    icon: <CircleCheck size={20} aria-hidden="true" />,
  },
  { status: "PRESENT", label: "Presente", icon: <Hand size={20} aria-hidden="true" /> },
];

/** Status que contam como "aluno presente na sessão" (linha azul). */
export const PRESENT_LIKE_STATUSES: ReadonlyArray<AttendanceStatus> = ["PRESENT", "LATE"];
