// src/components/features/attendance/AssignRoleModal.tsx

//   campo "Nota extra" (0 a 10), exigido pela US10
//   só alunos presentes ou atrasados podem receber papel
//   papel ocupado mostra o aviso de transferência, mas pode ser alterado
"use client";

import React, { useState } from "react";
import { X, Check, UserCheck, AlertCircle, Info } from "lucide-react";
import type { SessionRole } from "../../../types/sessionRole";
import { SESSION_ROLE_LABELS, SESSION_ROLES } from "../session-roles/sessionRoleOptions";
import { SessionRoleIcon } from "../session-roles/SessionRoleIcon";
import { EXTRA_GRADE_MESSAGE, parseExtraGrade } from "../session-roles/SessionRoleForm";

export interface OccupiedRoleInfo {
  studentId: string;
  studentName: string;
}

interface AssignRoleModalProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  currentRole: SessionRole | null;
  currentExtraGrade: number | null;
  /** Quem está com cada papel na sessão. */
  occupiedRoles?: Partial<Record<SessionRole, OccupiedRoleInfo>>;
  /** Regra 1: false quando o aluno não está presente nem atrasado. */
  canReceiveRole: boolean;
  onClose: () => void;
  /** role = null: "Sem papel específico". */
  onSaveRole: (role: SessionRole | null, extraGrade: number | null) => void;
}

const ROLE_DESCRIPTIONS: Record<SessionRole, string> = {
  COORDINATOR: "Conduz os passos do PBL, incentiva a participação de todos e mantém o foco no problema.",
  BOARD_SECRETARY: "Registra no quadro os termos desconhecidos, hipóteses levantadas e objetivos de aprendizagem.",
  TABLE_SECRETARY: "Controla o tempo de cada etapa da discussão, auxilia o coordenador e organiza anotações.",
};

export function AssignRoleModal({
  isOpen,
  studentId,
  studentName,
  currentRole,
  currentExtraGrade,
  occupiedRoles = {},
  canReceiveRole,
  onClose,
  onSaveRole,
}: AssignRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<SessionRole | null>(currentRole);
  const [gradeText, setGradeText] = useState(currentExtraGrade != null ? String(currentExtraGrade) : "");
  const [gradeError, setGradeError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Regra 2: o papel escolhido já está com outro aluno -> aviso de transferência (pode confirmar)
  const selectedRoleOccupant =
    selectedRole && occupiedRoles[selectedRole] && occupiedRoles[selectedRole]!.studentId !== studentId
      ? occupiedRoles[selectedRole]!
      : null;

  const handleSave = () => {
    if (selectedRole === null) {
      onSaveRole(null, null);
      onClose();
      return;
    }
    const extraGrade = parseExtraGrade(gradeText);
    if (extraGrade === null) {
      setGradeError(EXTRA_GRADE_MESSAGE);
      return;
    }
    onSaveRole(selectedRole, extraGrade);
    onClose();
  };

  // Nada mudou: o botão de confirmar fica desativado
  const unchanged =
    selectedRole === currentRole &&
    (selectedRole === null || parseExtraGrade(gradeText) === currentExtraGrade);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-role-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative text-gray-800">
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar modal de papéis"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center shrink-0">
            <SessionRoleIcon role={selectedRole} size={22} />
          </div>
          <div>
            <h2 id="assign-role-title" className="text-xl font-bold text-gray-900 leading-tight">
              Papel na Sessão
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Definir função para <strong className="text-gray-700">{studentName}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 mt-2">
          Na metodologia PBL, cada sessão tutorial possui <strong>apenas um</strong> de cada papel. Veja os papéis disponíveis:
        </p>

        {/* aluno ausente só pode ficar sem papel*/}
        {!canReceiveRole && (
          <div role="note" className="mb-4 bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded-2xl text-xs flex items-start gap-2">
            <Info size={16} className="text-gray-500 shrink-0 mt-0.5" />
            <p>
              Só é possível atribuir papel a alunos <strong>presentes</strong> ou <strong>atrasados</strong>. Registre a
              presença de {studentName} primeiro.
            </p>
          </div>
        )}

        <div className="space-y-2.5 mb-4">
          {SESSION_ROLES.map((role) => {
            const isSelected = selectedRole === role;
            const occupant = occupiedRoles[role];
            const isOccupiedByOther = occupant && occupant.studentId !== studentId;
            const isOccupiedByCurrent = occupant && occupant.studentId === studentId;

            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                disabled={!canReceiveRole}
                aria-pressed={isSelected}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-[#4354A0] bg-[#EEEDF8]/50 shadow-xs ring-1 ring-[#4354A0]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    isSelected ? "border-[#4354A0] bg-[#4354A0] text-white" : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-bold text-gray-900">{SESSION_ROLE_LABELS[role]}</p>
                    {isOccupiedByCurrent ? (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full shrink-0">
                        Papel atual
                      </span>
                    ) : isOccupiedByOther ? (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full truncate max-w-[55%]">
                        Ocupado por {occupant.studentName.split(" ")[0]}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full shrink-0">
                        Disponível
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </button>
            );
          })}

          {/* Sem papel (Membro comum) */}
          <button
            type="button"
            onClick={() => setSelectedRole(null)}
            aria-pressed={selectedRole === null}
            className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
              selectedRole === null
                ? "border-[#4354A0] bg-[#EEEDF8]/30 font-semibold"
                : "border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <UserCheck size={18} className="text-gray-400 shrink-0 ml-1" />
            <span className="text-xs">Sem papel específico (Membro comum da equipe)</span>
          </button>
        </div>

        {/* Nota extra pelo papel (US10): só aparece quando há papel escolhido */}
        {selectedRole && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <label htmlFor="assign-role-extra-grade" className="text-sm font-semibold text-gray-700">
              Nota extra <span className="font-normal text-gray-400">(0 a 10)</span>
            </label>
            <input
              id="assign-role-extra-grade"
              type="text"
              inputMode="decimal"
              placeholder="0 a 10"
              value={gradeText}
              onChange={(e) => {
                setGradeText(e.target.value);
                setGradeError(null);
              }}
              aria-invalid={Boolean(gradeError)}
              className={`w-24 px-3 py-2 text-center rounded-xl border text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 ${
                gradeError ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-[#4354A0]"
              }`}
            />
          </div>
        )}
        {gradeError && (
          <p role="alert" className="-mt-2 mb-4 text-xs font-semibold text-red-600">
            {gradeError}
          </p>
        )}

        {/* Regra 2: aviso de transferência quando o papel pertence a outro aluno */}
        {selectedRoleOccupant && selectedRole && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              O papel <strong>{SESSION_ROLE_LABELS[selectedRole]}</strong> já está com{" "}
              <strong>{selectedRoleOccupant.studentName}</strong>. Ao confirmar, o papel será transferido para{" "}
              <strong>{studentName}</strong> e {selectedRoleOccupant.studentName} passará a ser Membro.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={unchanged}
            className="flex-1 py-3 px-4 rounded-xl bg-[#4354A0] hover:bg-[#354382] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Papel
          </button>
        </div>
      </div>
    </div>
  );
}
