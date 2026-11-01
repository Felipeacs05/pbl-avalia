// src/components/features/evaluations/PeerEvaluationCard.tsx

// o cabeçalho (foto + nome + seta) abre e fecha as notas.
// O card não guarda as notas, recebe os valores e avisa o modal a cada mudança (onScoreChange,
// onCommentChange). Assim o modal consegue validar a lista inteira de uma vez.
"use client";

import React, { useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import type { Student } from "../../../types/student";
import type { PeerEvaluationScores } from "../../../types/evaluation";
import { getInitials } from "../../ui/Avatar";

// Critérios do Figma, na ordem em que aparecem
export const PEER_CRITERIA: { key: keyof PeerEvaluationScores; label: string }[] = [
  { key: "content", label: "Conteúdo/Produto" },
  { key: "participation", label: "Participação" },
  { key: "behavior", label: "Comportamento" },
];

export type DraftScores = Record<keyof PeerEvaluationScores, number | null>;

const MIN_SCORE = 0;
const MAX_SCORE = 10;

function parseScore(value: string): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(number)));
}

interface PeerEvaluationCardProps {
  peer: Student;
  scores: DraftScores;
  comment: string;
  isExpanded: boolean;
  onToggle: () => void;
  onScoreChange: (key: keyof PeerEvaluationScores, value: number | null) => void;
  onCommentChange: (value: string) => void;
  disabled?: boolean;
}

export function PeerEvaluationCard({
  peer,
  scores,
  comment,
  isExpanded,
  onToggle,
  onScoreChange,
  onCommentChange,
  disabled = false,
}: PeerEvaluationCardProps) {
  
  const [imageError, setImageError] = useState(false);

  const filledCount = PEER_CRITERIA.filter(({ key }) => scores[key] !== null).length;
  const isComplete = filledCount === PEER_CRITERIA.length;
  const contentId = `peer-card-content-${peer.id}`;

  return (
    <div className={`rounded-2xl border transition-colors ${isComplete ? "border-[#4354A0]/40" : "border-gray-200"}`}>
      {/* Cabeçalho clicável: abre/fecha as notas do colega.
          aria-expanded e aria-controls fazem o leitor de tela anunciar se está aberto. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-[#EEEDF8] text-[#4354A0] text-xs font-bold flex items-center justify-center">
          {peer.avatarUrl && !imageError ? (
            <img src={peer.avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setImageError(true)} />
          ) : (
            getInitials(peer.name)
          )}
        </div>

        <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">{peer.name}</span>

        {/* Progresso: "1/3" enquanto falta nota, check verde quando completo */}
        {isComplete ? (
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" aria-label="Notas completas" />
        ) : (
          <span className="text-[11px] font-semibold text-gray-400 shrink-0">
            {filledCount}/{PEER_CRITERIA.length}
          </span>
        )}

        {/* Seta do Figma: gira para cima quando o card está aberto */}
        <span className="w-7 h-7 shrink-0 rounded-full bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center">
          <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Conteúdo do acordeão: só existe na tela quando o card está aberto */}
      {isExpanded && (
        <div id={contentId} className="px-4 pb-4 flex flex-col gap-2">
          {PEER_CRITERIA.map(({ key, label }) => {
            const inputId = `peer-${peer.id}-${key}`;
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
                  {label}
                </label>
                {/* Input numérico restrito: min/max/step limitam as setas do teclado, e o parseScore corrige o que for digitado fora da faixa. */}
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={MIN_SCORE}
                  max={MAX_SCORE}
                  step={1}
                  placeholder="-"
                  value={scores[key] ?? ""}
                  onChange={(e) => onScoreChange(key, parseScore(e.target.value))}
                  disabled={disabled}
                  aria-required="true"
                  className="w-20 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#4354A0] focus:ring-2 focus:ring-[#4354A0]/15 disabled:bg-gray-50"
                />
              </div>
            );
          })}

          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={disabled}
            aria-label={`Comentário sobre ${peer.name}`}
            placeholder="Comentário (opcional)"
            rows={2}
            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-xs placeholder:text-gray-400 outline-none focus:border-[#4354A0] resize-none"
          />
        </div>
      )}
    </div>
  );
}
