// src/components/features/performance-tables/PresetToggleCard.tsx

// Card liga/desliga de um item do Pré-set (Auto Avaliação e Avaliação em pares).
// Sem onToggle, só mostra o estado (usado na tela de desempenho do aluno).
"use client";

import React from "react";

interface PresetToggleCardProps {
  title: string;
  isChecked: boolean;
  onToggle?: () => void;
}

export function PresetToggleCard({ title, isChecked, onToggle }: PresetToggleCardProps) {
  return (
    <div className="w-full rounded-2xl border border-[#4F5FB5] bg-[#3B4C9B] px-4 py-3 flex items-center justify-between gap-3 text-white shadow-sm">
      <p className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">{title}</p>

      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={title}
        disabled={!onToggle}
        onClick={onToggle}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/40 ${
          onToggle ? "cursor-pointer" : "cursor-default"
        } ${isChecked ? "bg-[#B3BAE5]" : "bg-[#7B7B7B]"}`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
            isChecked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
