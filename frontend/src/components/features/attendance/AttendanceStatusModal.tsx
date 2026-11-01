// src/components/features/attendance/AttendanceStatusModal.tsx

"use client";

import React, { useState } from "react";
import { X, Check, ClipboardCheck } from "lucide-react";
import type { AttendanceStatus } from "../../../types/attendance";
import { ATTENDANCE_STATUS_OPTIONS } from "./attendanceStatusOptions";

interface AttendanceStatusModalProps {
  isOpen: boolean;
  studentName: string;
  currentStatus: AttendanceStatus | null;
  onClose: () => void;
  onConfirm: (status: AttendanceStatus) => void;
}

const STATUS_DESCRIPTIONS: Record<AttendanceStatus, string> = {
  PRESENT: "Chegou no horário e participa da sessão.",
  LATE: "Chegou depois do início, mas participa da sessão.",
  ABSENT: "Não compareceu à sessão.",
  JUSTIFIED_ABSENCE: "Não compareceu, mas apresentou justificativa.",
};

// Presente primeiro: é a opção mais usada na chamada
const OPTIONS_IN_ORDER = [...ATTENDANCE_STATUS_OPTIONS].reverse();

export function AttendanceStatusModal({
  isOpen,
  studentName,
  currentStatus,
  onClose,
  onConfirm,
}: AttendanceStatusModalProps) {
  const [selected, setSelected] = useState<AttendanceStatus | null>(currentStatus);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative text-gray-800">
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar modal de presença"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center shrink-0">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <h2 id="attendance-status-title" className="text-xl font-bold text-gray-900 leading-tight">
              Presença
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Registrar presença de <strong className="text-gray-700">{studentName}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 mt-2">
          Selecione a situação do aluno nesta sessão. Só alunos presentes ou atrasados podem receber papel.
        </p>

        <div className="space-y-2.5 mb-5">
          {OPTIONS_IN_ORDER.map(({ status, label, icon }) => {
            const isSelected = selected === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelected(status)}
                aria-label={label}
                aria-pressed={isSelected}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "border-[#4354A0] bg-[#EEEDF8]/50 shadow-xs ring-1 ring-[#4354A0]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-[#4354A0] text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    {status === currentStatus && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{STATUS_DESCRIPTIONS[status]}</p>
                </div>
                {isSelected && <Check size={18} className="text-[#4354A0] shrink-0" />}
              </button>
            );
          })}
        </div>

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
            onClick={handleConfirm}
            disabled={!selected || selected === currentStatus}
            className="flex-1 py-3 px-4 rounded-xl bg-[#4354A0] hover:bg-[#354382] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
