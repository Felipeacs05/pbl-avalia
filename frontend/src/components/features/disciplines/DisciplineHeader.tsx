import React from "react";
import { Upload } from "lucide-react";

// src/components/features/disciplines/DisciplineHeader.tsx

interface DisciplineHeaderProps {
  name: string;
  description: string;
  onMessageClass?: () => void;
}

export function DisciplineHeader({
  name,
  description,
  onMessageClass,
}: DisciplineHeaderProps) {
  return (
    <div className="mb-6 w-full flex flex-col items-center text-center">
      {/* Discipline title */}
      <div className="relative w-full flex items-center justify-center mb-2">
        <h1 className="text-2xl font-bold text-[#182860] tracking-tight leading-tight text-center">
          {name}
        </h1>
        {onMessageClass && (
          <button
            onClick={onMessageClass}
            className="absolute right-0 hidden sm:flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#4354A0] hover:bg-[#F0F1FA] transition-colors active:scale-95 shadow-sm"
            aria-label="Fale para turma"
          >
            <Upload size={14} />
            <span>Fale para turma</span>
          </button>
        )}
      </div>

      {/* Discipline description */}
      <p className="text-sm text-gray-500 leading-relaxed text-center max-w-2xl mx-auto mb-3">
        {description}
      </p>

      {/* Message class button on mobile */}
      {onMessageClass && (
        <button
          onClick={onMessageClass}
          className="sm:hidden inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[#4354A0] hover:bg-[#F0F1FA] transition-colors active:scale-95 shadow-sm"
          aria-label="Fale para turma"
        >
          <Upload size={14} />
          <span>Fale para turma</span>
        </button>
      )}
    </div>
  );
}
