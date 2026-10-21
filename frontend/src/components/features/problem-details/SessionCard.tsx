// src/components/features/problem-details/SessionCard.tsx
"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import type { Session } from "../../../types/problem";

interface SessionCardProps {
  session: Session;
  index: number;
  onSelectSession?: (session: Session) => void;
}

const GRADIENT_VARIANTS = [
  "from-[#3B4899] to-[#4354A0]",
  "from-[#4354A0] to-[#5566B8]",
  "from-[#2D3A7C] to-[#4354A0]",
] as const;

export function SessionCard({
  session,
  index,
  onSelectSession,
}: SessionCardProps) {
  const gradientClass = GRADIENT_VARIANTS[index % GRADIENT_VARIANTS.length];

  return (
    <button
      type="button"
      onClick={() => onSelectSession?.(session)}
      aria-label={`Sessão ${session.displayDate} - ${session.statusLabel}`}
      data-testid={`past-session-card-${session.id}`}
      className={`w-full text-left relative bg-gradient-to-br ${gradientClass} text-white rounded-2xl p-5 shadow-md overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer group`}
    >
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-white/10 transition-colors" />

      {/* Date */}
      <p className="text-4xl font-bold tracking-tight text-center mb-3 drop-shadow-sm">
        {session.displayDate}
      </p>

      {/* Divider */}
      <div className="w-full h-px bg-white/20 mb-3" />

      {/* Status + Chart Icon */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/80 font-medium leading-snug flex-1 mr-2">
          {session.statusLabel}
        </span>
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
          <BarChart3 size={18} className="text-white/70" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
}
