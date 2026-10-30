// src/components/features/performance-tables/PresetCriterionCard.tsx

// Card de um critério do Pré-set (US07): nome, peso e os botões de editar e remover.
"use client";

import React from "react";
import { Edit, Trash2 } from "lucide-react";
import type { PresetCriterion } from "../../../types/performanceTable";

interface PresetCriterionCardProps {
  criterion: PresetCriterion;
  onEdit: () => void;
  onRemove: () => void;
}

export function PresetCriterionCard({ criterion, onEdit, onRemove }: PresetCriterionCardProps) {
  return (
    <div className="w-full rounded-2xl border border-[#4F5FB5] bg-[#3B4C9B] px-4 py-3 flex items-center justify-between gap-3 text-white shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold tracking-tight">{criterion.name}</p>
        <p className="text-xs font-medium text-indigo-200 mt-0.5">Peso {criterion.weight}%</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${criterion.name}`}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
        >
          <Edit size={18} />
        </button>
        {/* Sem lixeira para critério fixo (o Papel só pode ter o peso editado) */}
        {criterion.isRemovable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover ${criterion.name}`}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/90 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
