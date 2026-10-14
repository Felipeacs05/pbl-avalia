// src/components/features/problem-details/ProblemInfoCard.tsx
"use client";

import React from "react";
import { Play } from "lucide-react";

interface ProblemInfoCardProps {
  title: string;
  description: string;
  onStartSession: () => void;
  isStartingSession: boolean;
}

export function ProblemInfoCard({
  title,
  description,
  onStartSession,
  isStartingSession,
}: ProblemInfoCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
      <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">
        {title}
      </h1>

      <div className="w-full h-px bg-gray-200 mb-3" />

      <p className="text-sm text-gray-500 leading-relaxed mb-5">
        {description}
      </p>

      <button
        onClick={onStartSession}
        disabled={isStartingSession}
        className="w-full bg-[#182860] hover:bg-[#0f1d4a] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-3 group"
      >
        <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
          <Play size={16} className="text-white fill-white ml-0.5" />
        </span>
        {isStartingSession ? "Iniciando..." : "Iniciar Sessão"}
      </button>
    </div>
  );
}
