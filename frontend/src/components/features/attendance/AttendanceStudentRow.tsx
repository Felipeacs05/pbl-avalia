// src/components/features/attendance/AttendanceStudentRow.tsx
"use client";

import React, { useState } from "react";
import { Avatar } from "../../ui/Avatar";
import type { AttendanceRow, AttendanceStatus } from "../../../types/attendance";
import {
  ATTENDANCE_STATUS_OPTIONS,
  PRESENT_LIKE_STATUSES,
} from "./attendanceStatusOptions";
// ícone de tags e papel da US10
import { Tags } from "lucide-react";
import { ToggleIconButton } from "../../ui/ToggleIconButton";
import { AssignRoleModal, type OccupiedRoleInfo } from "./AssignRoleModal";
import { StudentTagsModal } from "./StudentTagsModal";
import type { SessionRole } from "../../../types/sessionRole";
import { SessionRoleIcon } from "../session-roles/SessionRoleIcon";
import { SESSION_ROLE_LABELS, SESSION_ROLE_STYLES } from "../session-roles/sessionRoleOptions";

/** Papel do aluno vindo do hook da US10. */
export interface StudentRoleState {
  role: SessionRole | null;
  extraGrade: number | null;
  isSaving: boolean;
}

interface AttendanceStudentRowProps {
  student: AttendanceRow;
  roleState?: StudentRoleState;
  occupiedRoles?: Partial<Record<SessionRole, OccupiedRoleInfo>>;
  onSaveRole?: (studentId: string, role: SessionRole | null, extraGrade: number | null) => void;
  onChangeStatus: (studentId: string, status: AttendanceStatus) => Promise<void>;
  onUpdateTags?: (studentId: string, tags: string[]) => void;
}

const ROLE_SHORT_LABELS: Record<SessionRole, string> = {
  COORDINATOR: "Coordenador",
  BOARD_SECRETARY: "Sec. Quadro",
  TABLE_SECRETARY: "Sec. Mesa",
};

const RECORDED_TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatRecordedTime(recordedAt: string): string {
  return `às ${RECORDED_TIME_FORMAT.format(new Date(recordedAt))}`;
}

export function AttendanceStudentRow({
  student,
  roleState,
  occupiedRoles = {},
  onSaveRole,
  onChangeStatus,
  onUpdateTags,
}: AttendanceStudentRowProps) {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(student.tags || []);

  const isPresentLike =
    student.status !== null && PRESENT_LIKE_STATUSES.includes(student.status);

  const role = roleState?.role ?? null;
  const roleBorder = role ? SESSION_ROLE_STYLES[role].border : null;
  const rowTone = isPresentLike
    ? `bg-[#3B4C9B] ${roleBorder ?? "border-[#4F5FB5]"} text-white`
    : `bg-[#71717A] ${roleBorder ?? "border-[#27272A]"} text-white`;
  const isSaving = student.isSaving || Boolean(roleState?.isSaving);

  const handleSaveTags = (newTags: string[]) => {
    setLocalTags(newTags);
    onUpdateTags?.(student.id, newTags);
  };

  const actionButtonTone = isPresentLike
    ? "bg-white/15 text-white hover:bg-white/25 active:bg-white/30"
    : "bg-black/30 text-white hover:bg-black/40 active:bg-black/50";

  const displayRole = role ? SESSION_ROLE_LABELS[role] : "Membro";
  const effectiveTags = student.tags || localTags;

  return (
    <>
      <li
        aria-busy={isSaving}
        className={`w-full rounded-full border-2 p-1.5 pr-3 sm:p-2 sm:pr-4 flex items-center gap-2 sm:gap-3.5 shadow-sm transition-colors duration-200 ${rowTone}`}
      >
        <Avatar
          src={student.avatarUrl}
          name={student.name}
          sizeClassName="w-11 h-11 sm:w-12 sm:h-12"
          dimmed={!isPresentLike}
        />

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm sm:text-base font-bold tracking-tight">
            {student.name}
          </p>
          {/* Com papel, a badge ocupa a linha (encolhe com "…" no celular); sem papel, mostra o horário */}
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-[11px] sm:text-xs">
            {role ? (
              <span
                title={SESSION_ROLE_LABELS[role]}
                className={`min-w-0 truncate rounded-full px-2 py-0.5 font-bold leading-4 ${SESSION_ROLE_STYLES[role].badge}`}
              >
                {ROLE_SHORT_LABELS[role]}
              </span>
            ) : (
              <span className="opacity-85 shrink-0">Membro</span>
            )}
            {isSaving ? (
              <span className="truncate opacity-85">Salvando…</span>
            ) : !role && student.recordedAt ? (
              <span className="truncate opacity-85">{formatRecordedTime(student.recordedAt)}</span>
            ) : null}
          </div>
        </div>

        {/* Action Buttons Group */}
        <div
          role="group"
          aria-label="Ações do aluno e status da presença"
          className="flex items-center gap-1 sm:gap-1.5 shrink-0"
        >
          {/* Botão 1: Papel do aluno na sessão (ícone muda conforme o cargo) */}
          <button
            type="button"
            onClick={() => setIsRoleModalOpen(true)}
            aria-label={`Papel de ${student.name}`}
            aria-pressed={isRoleModalOpen}
            title={`Definir papel na sessão (atual: ${displayRole})`}
            className={`min-h-11 min-w-11 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${actionButtonTone}`}
          >
            <SessionRoleIcon role={role} size={20} />
          </button>

          {/* Botão 2: Tags e observações formativas */}
          <button
            type="button"
            onClick={() => setIsTagsModalOpen(true)}
            aria-label={`Tags de ${student.name}`}
            aria-pressed={isTagsModalOpen}
            title={`Inserir tags e anotações (${effectiveTags.length} aplicadas)`}
            className={`min-h-11 min-w-11 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer relative focus-visible:outline-2 focus-visible:outline-white ${actionButtonTone}`}
          >
            <Tags size={20} />
            {effectiveTags.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white" />
            )}
          </button>

          {/* Botões de Presença e Chamada (US09), como nos testes */}
          {ATTENDANCE_STATUS_OPTIONS.map(({ status, label, icon }) => (
            <ToggleIconButton
              key={status}
              icon={icon}
              label={label}
              pressed={student.status === status}
              variant={isPresentLike ? "glass" : "solid"}
              onClick={() => void onChangeStatus(student.id, status)}
            />
          ))}
        </div>
      </li>

      {/* só presente ou atrasado recebe papel, aplicada dentro do modal) */}
      {isRoleModalOpen && (
        <AssignRoleModal
          isOpen
          studentId={student.id}
          studentName={student.name}
          currentRole={role}
          currentExtraGrade={roleState?.extraGrade ?? null}
          occupiedRoles={occupiedRoles}
          canReceiveRole={isPresentLike}
          onClose={() => setIsRoleModalOpen(false)}
          onSaveRole={(newRole, extraGrade) => onSaveRole?.(student.id, newRole, extraGrade)}
        />
      )}

      {/* Modal de Inserção de Tags */}
      <StudentTagsModal
        isOpen={isTagsModalOpen}
        studentName={student.name}
        initialTags={effectiveTags}
        onClose={() => setIsTagsModalOpen(false)}
        onSaveTags={handleSaveTags}
      />
    </>
  );
}
