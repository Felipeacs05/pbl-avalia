// src/components/features/attendance/AssignRoleModal.tsx
"use client";

import React, { useState } from "react";
import { X, HardHat, Check, UserCheck, AlertCircle } from "lucide-react";

export interface OccupiedRoleInfo {
  studentId: string;
  studentName: string;
}

interface AssignRoleModalProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  currentRole?: string;
  occupiedRoles?: Record<string, OccupiedRoleInfo>;
  onClose: () => void;
  onSaveRole: (role: string | undefined) => void;
}

const AVAILABLE_ROLES = [
  {
    name: "Coordenador",
    description: "Conduz os passos do PBL, incentiva a participação de todos e mantém o foco no problema.",
  },
  {
    name: "Quadro",
    description: "Registra no quadro os termos desconhecidos, hipóteses levantadas e objetivos de aprendizagem.",
  },
  {
    name: "Mesa",
    description: "Controla o tempo de cada etapa da discussão, auxilia o coordenador e organiza anotações.",
  },
] as const;

export function AssignRoleModal({
  isOpen,
  studentId,
  studentName,
  currentRole,
  occupiedRoles = {},
  onClose,
  onSaveRole,
}: AssignRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<string | undefined>(currentRole);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveRole(selectedRole);
    onClose();
  };

  // Verifica se o papel selecionado atualmente pertence a outro aluno
  const selectedRoleOccupant =
    selectedRole && occupiedRoles[selectedRole] && occupiedRoles[selectedRole].studentId !== studentId
      ? occupiedRoles[selectedRole]
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-role-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-gray-800">
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
            <HardHat size={22} />
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

        {/* Roles List */}
        <div className="space-y-2.5 mb-4">
          {AVAILABLE_ROLES.map((role) => {
            const isSelected = selectedRole?.toLowerCase() === role.name.toLowerCase();
            const occupant = occupiedRoles[role.name];
            const isOccupiedByOther = occupant && occupant.studentId !== studentId;
            const isOccupiedByCurrent = occupant && occupant.studentId === studentId;

            return (
              <button
                key={role.name}
                type="button"
                onClick={() => setSelectedRole(role.name)}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
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
                    <p className="text-sm font-bold text-gray-900">{role.name}</p>
                    {isOccupiedByCurrent ? (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                        Papel atual
                      </span>
                    ) : isOccupiedByOther ? (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                        Ocupado por {occupant.studentName}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        Disponível
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Opção de Remover Papel (Membro comum) */}
          <button
            type="button"
            onClick={() => setSelectedRole(undefined)}
            className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
              !selectedRole
                ? "border-[#4354A0] bg-[#EEEDF8]/30 font-semibold"
                : "border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <UserCheck size={18} className="text-gray-400 shrink-0 ml-1" />
            <span className="text-xs">Sem papel específico (Membro comum da equipe)</span>
          </button>
        </div>

        {/* Alerta de Substituição / Transferência caso o papel pertença a outro aluno */}
        {selectedRoleOccupant && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p>
              O papel <strong>{selectedRole}</strong> já está com <strong>{selectedRoleOccupant.studentName}</strong>. Ao confirmar, o papel será transferido para <strong>{studentName}</strong> e {selectedRoleOccupant.studentName} passará a ser Membro.
            </p>
          </div>
        )}

        {/* Actions */}
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
            className="flex-1 py-3 px-4 rounded-xl bg-[#4354A0] hover:bg-[#354382] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer text-center"
          >
            Confirmar Papel
          </button>
        </div>
      </div>
    </div>
  );
}
