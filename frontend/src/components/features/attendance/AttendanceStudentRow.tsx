// src/components/features/attendance/AttendanceStudentRow.tsx
"use client";

import React, { useState } from "react";
import { Avatar } from "../../ui/Avatar";
import { ToggleIconButton } from "../../ui/ToggleIconButton";
import type { AttendanceRow, AttendanceStatus } from "../../../types/attendance";
import {
  ATTENDANCE_STATUS_OPTIONS,
  PRESENT_LIKE_STATUSES,
} from "./attendanceStatusOptions";
import { HardHat, MapPin } from "lucide-react";
import { AssignRoleModal, type OccupiedRoleInfo } from "./AssignRoleModal";
import { StudentTagsModal } from "./StudentTagsModal";

interface AttendanceStudentRowProps {
  student: AttendanceRow;
  occupiedRoles?: Record<string, OccupiedRoleInfo>;
  onChangeStatus: (studentId: string, status: AttendanceStatus) => Promise<void>;
  onAssignRole?: (studentId: string, role: string | undefined) => void;
  onUpdateTags?: (studentId: string, tags: string[]) => void;
}

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
  occupiedRoles = {},
  onChangeStatus,
  onAssignRole,
  onUpdateTags,
}: AttendanceStudentRowProps) {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(student.tags || []);

  const isPresentLike =
    student.status !== null && PRESENT_LIKE_STATUSES.includes(student.status);

  const rowTone = isPresentLike
    ? "bg-[#3B4C9B] border-[#4F5FB5] text-white"
    : "bg-[#71717A] border-[#27272A] text-white";

  const handleSaveRole = (newRole: string | undefined) => {
    onAssignRole?.(student.id, newRole);
  };

  const handleSaveTags = (newTags: string[]) => {
    setLocalTags(newTags);
    onUpdateTags?.(student.id, newTags);
  };

  const actionButtonTone = isPresentLike
    ? "bg-white/15 text-white hover:bg-white/25 active:bg-white/30"
    : "bg-black/30 text-white hover:bg-black/40 active:bg-black/50";

  const displayRole = student.role || "Membro";
  const effectiveTags = student.tags || localTags;

  return (
    <>
      <li
        aria-busy={student.isSaving}
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
            {displayRole}
            {student.isSaving ? (
              <span> · Salvando…</span>
            ) : student.recordedAt ? (
              <span> · {formatRecordedTime(student.recordedAt)}</span>
            ) : null}
          </p>
        </div>

        {/* Action Buttons Group */}
        <div
          role="group"
          aria-label="Ações do aluno e status da presença"
          className="flex items-center gap-1 sm:gap-1.5 shrink-0"
        >
          {/* Botão 1: Papel do aluno na sessão (Coordenador, Quadro, Mesa) */}
          <button
            type="button"
            onClick={() => setIsRoleModalOpen(true)}
            aria-label={`Papel de ${student.name}`}
            aria-pressed={isRoleModalOpen}
            title={`Definir papel na sessão (atual: ${displayRole})`}
            className={`min-h-11 min-w-11 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${actionButtonTone}`}
          >
            <HardHat size={20} />
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
            <MapPin size={20} />
            {effectiveTags.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white" />
            )}
          </button>

          {/* Botões de Presença e Chamada (US09) */}
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

      {/* Modal de Atribuição de Papel */}
      <AssignRoleModal
        isOpen={isRoleModalOpen}
        studentId={student.id}
        studentName={student.name}
        currentRole={student.role}
        occupiedRoles={occupiedRoles}
        onClose={() => setIsRoleModalOpen(false)}
        onSaveRole={handleSaveRole}
      />

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
