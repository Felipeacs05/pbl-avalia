// src/components/features/attendance/EvaluationStudentRow.tsx
"use client";

import React from "react";
import { Avatar } from "../../ui/Avatar";
import { Settings } from "lucide-react";
import type { SessionStudent } from "../../../types/attendance";
import { PRESENT_LIKE_STATUSES } from "./attendanceStatusOptions";

interface EvaluationStudentRowProps {
  student: SessionStudent;
  onConfigureEvaluation?: (student: SessionStudent) => void;
}

export function EvaluationStudentRow({
  student,
  onConfigureEvaluation,
}: EvaluationStudentRowProps) {
  const isPresentLike =
    student.status !== null && PRESENT_LIKE_STATUSES.includes(student.status);

  const rowTone = isPresentLike
    ? "bg-[#3B4C9B] border-[#4F5FB5] text-white"
    : "bg-[#71717A] border-[#27272A] text-white";

  const actionButtonTone = isPresentLike
    ? "bg-white/15 text-white hover:bg-white/25 active:bg-white/30"
    : "bg-black/30 text-white hover:bg-black/40 active:bg-black/50";

  // Determina o texto de subtítulo:
  // Se presente -> mostra o cargo (Coordenador, Quadro, Mesa ou Membro)
  // Se ausente -> mostra "Ausente" ou "Ausente com justificativa"
  const subtitle = isPresentLike
    ? student.role || "Membro"
    : student.status === "JUSTIFIED_ABSENCE"
    ? "Ausente com justificativa"
    : "Ausente";

  return (
    <li
      className={`w-full rounded-full border-2 p-1.5 pr-3 sm:p-2 sm:pr-4 flex items-center gap-2 sm:gap-3.5 shadow-sm transition-colors duration-200 ${rowTone}`}
    >
      <Avatar
        src={student.avatarUrl}
        sizeClassName="w-11 h-11 sm:w-12 sm:h-12"
        dimmed={!isPresentLike}
      />

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm sm:text-base font-bold tracking-tight">
          {student.name}
        </p>
        <p className="truncate text-[11px] sm:text-xs opacity-85 mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Apenas o ícone da engrenagem à direita, conforme o Figma */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={() => onConfigureEvaluation?.(student)}
          aria-label={`Avaliar ${student.name}`}
          title={`Avaliação individual de ${student.name}`}
          className={`min-h-11 min-w-11 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${actionButtonTone}`}
        >
          <Settings size={20} />
        </button>
      </div>
    </li>
  );
}
