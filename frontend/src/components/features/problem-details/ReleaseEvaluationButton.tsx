// src/components/features/problem-details/ReleaseEvaluationButton.tsx
"use client";

import React from "react";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import type { EvaluationType, ReleasableEvaluationType } from "../../../types/evaluation";

interface ReleaseEvaluationButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  activeType?: EvaluationType;
  // Quando as duas avaliações estão liberadas juntas
  activeTypes?: ReleasableEvaluationType[];
  isReleased?: boolean;
  label?: string;
}

export function ReleaseEvaluationButton({
  onClick,
  isLoading = false,
  activeType,
  activeTypes,
  isReleased = false,
  label,
}: ReleaseEvaluationButtonProps) {
  const getButtonText = () => {
    if (label) return label;
    if (isLoading) return "Carregando...";
    if (isReleased) {
      if (activeTypes && activeTypes.length > 1) return "Avaliações Liberadas";
      if (activeType === "self_evaluation") return "Autoavaliação Liberada";
      if (activeType === "peer_evaluation") return "Avaliação entre Pares Liberada";
      return "Avaliação Liberada";
    }
    return "Liberar Avaliações";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-3.5 rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
        isReleased
          ? "bg-[#5A66B3] hover:bg-[#4C58A5] text-white ring-2 ring-[#8D96DC]/50"
          : "bg-[#757DC3] hover:bg-[#636BAE] text-white"
      }`}
    >
      {isReleased ? <CheckCircle2 size={18} className="text-emerald-300" /> : <ClipboardCheck size={18} />}
      <span>{getButtonText()}</span>
    </button>
  );
}
