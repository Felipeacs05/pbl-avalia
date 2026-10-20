// src/components/features/evaluations/ReleaseEvaluationModal.tsx
"use client";

import React, { useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type { EvaluationType } from "../../../types/evaluation";
import { EvaluationToggleCard } from "./EvaluationToggleCard";

interface ReleaseEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: EvaluationType;
  onToggleType: (type: "self_evaluation" | "peer_evaluation") => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function ReleaseEvaluationModal({
  isOpen,
  onClose,
  selectedType,
  onToggleType,
  onConfirm,
  isSubmitting = false,
}: ReleaseEvaluationModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Card Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] bg-[#334195] border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl relative flex flex-col gap-6 text-white transform transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="modal-title"
              className="text-2xl font-bold tracking-tight text-white leading-tight"
            >
              Liberar avaliações
            </h2>
            <p className="text-sm text-[#C4CAEC] mt-1 leading-snug">
              Selecione a avaliação para ser liberada para os alunos.
            </p>
          </div>

          {/* Close 'X' Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X size={22} />
          </button>
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-3.5">
          {/* Option 1: Autoavaliação */}
          <EvaluationToggleCard
            id="evaluation-option-self"
            title="Autoavaliação"
            description="Aluno lança nota nos mesmos critérios da Tabela de Desempenho"
            isChecked={selectedType === "self_evaluation"}
            onToggle={() => onToggleType("self_evaluation")}
            disabled={isSubmitting}
          />

          {/* Option 2: Avaliação entre Pares */}
          <EvaluationToggleCard
            id="evaluation-option-peer"
            title="Avaliação entre Pares"
            description="Cada aluno avalia os colegas da turma."
            isChecked={selectedType === "peer_evaluation"}
            onToggle={() => onToggleType("peer_evaluation")}
            disabled={isSubmitting}
          />
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full bg-[#717DBF] hover:bg-[#626EAF] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-semibold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Liberando...</span>
              </>
            ) : (
              <span>Liberar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
