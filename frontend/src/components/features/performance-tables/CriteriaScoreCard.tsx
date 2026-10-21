// src/components/features/performance-tables/CriteriaScoreCard.tsx
"use client";

import React from "react";
import { Check, X, Minus, Plus } from "lucide-react";

interface CriteriaScoreCardProps {
  title: string;
  weightLabel?: string;
  score?: number;
  type?: "score" | "toggle";
  togglePassed?: boolean;
  onToggle?: (passed: boolean) => void;
  // antes: onScoreClick, que só alternava entre 2 valores fixos
  onScoreChange?: (score: number) => void;
  min?: number;
  max?: number;
  step?: number;
  tone?: "blue" | "gray";
  scorePrefix?: string;
}

export function CriteriaScoreCard({
  title,
  weightLabel = "Peso 1",
  score = 100,
  type = "score",
  togglePassed = true,
  onToggle,
  onScoreChange,
  min = 0,
  max = 100,
  step = 5,
  tone = "blue",
  scorePrefix = "",
}: CriteriaScoreCardProps) {
  const isBlue = tone === "blue";

  // soma/subtrai "step" sem passar dos limites
  const changeScore = (delta: number) => {
    onScoreChange?.(Math.min(max, Math.max(min, score + delta)));
  };
  const stepButtonClass =
    "w-8 h-8 rounded-full flex items-center justify-center border border-white/30 text-white/90 hover:bg-white/15 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

  const cardTone = isBlue
    ? "bg-[#3B4C9B] border-[#4F5FB5]"
    : "bg-[#5D5E63] border-[#6F7076]";

  const badgeTone = isBlue
    ? "bg-[#2D3A74] border-indigo-400/50 hover:bg-[#263266]"
    : "bg-[#48494D] border-gray-400/50 hover:bg-[#3D3E42]";

  return (
    <div
      className={`w-full rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between text-white shadow-sm transition-colors duration-200 ${cardTone}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-white tracking-tight">
          {title}
        </p>
        {weightLabel && (
          <p
            className={`text-xs font-medium mt-0.5 ${
              isBlue ? "text-indigo-200" : "text-gray-300"
            }`}
          >
            {weightLabel}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {type === "toggle" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle?.(false)}
              aria-label="Não atendeu ao papel"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                !togglePassed
                  ? "bg-red-500 text-white shadow-sm"
                  : "border border-indigo-300/40 text-indigo-200 hover:text-white"
              }`}
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={() => onToggle?.(true)}
              aria-label="Atendeu ao papel"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                togglePassed
                  ? "bg-[#22C55E] text-white shadow-sm"
                  : "border border-indigo-300/40 text-indigo-200 hover:text-white"
              }`}
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          // − nota + no lugar do botão que alternava valores
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => changeScore(-step)}
              disabled={score <= min}
              aria-label={`Diminuir nota de ${title}`}
              className={stepButtonClass}
            >
              <Minus size={16} />
            </button>
            {/* aria-live: o leitor de tela anuncia a nota nova a cada clique */}
            <span
              aria-live="polite"
              aria-label={`Nota de ${title}: ${scorePrefix}${score}%`}
              className={`min-w-[4.25rem] text-center border rounded-xl px-2.5 py-1.5 text-white font-bold text-sm tracking-wide shadow-inner ${badgeTone}`}
            >
              {scorePrefix}
              {score}%
            </span>
            <button
              type="button"
              onClick={() => changeScore(step)}
              disabled={score >= max}
              aria-label={`Aumentar nota de ${title}`}
              className={stepButtonClass}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
