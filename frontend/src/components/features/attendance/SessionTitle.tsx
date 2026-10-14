// src/components/features/attendance/SessionTitle.tsx
import React from "react";

interface SessionTitleProps {
  /** Dia da sessão já formatado, ex.: "24/03". */
  dateLabel: string;
}

/**
 * Mobile: título em pílula branca centralizado (Figma).
 * Desktop: título alinhado à esquerda, sem a pílula.
 */
export function SessionTitle({ dateLabel }: SessionTitleProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-[280px] sm:max-w-xs bg-white border-2 border-[#0099FF] rounded-2xl py-2.5 px-6 shadow-sm text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Sessão
        </h1>
      </div>
      <p className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
        Dia {dateLabel || "24/03"}
      </p>
    </div>
  );
}
