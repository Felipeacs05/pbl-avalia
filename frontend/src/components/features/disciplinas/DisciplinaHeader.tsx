import React from "react";
import { Upload } from "lucide-react";

// src/components/features/disciplinas/DisciplinaHeader.tsx

interface DisciplinaHeaderProps {
  nome: string;
  descricao: string;
  onFaleTurma?: () => void;
}

export function DisciplinaHeader({
  nome,
  descricao,
  onFaleTurma,
}: DisciplinaHeaderProps) {
  return (
    <div className="mb-6">
      {/* Título da disciplina + botão fale para turma */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold text-[#182860] tracking-tight leading-tight">
          {nome}
        </h1>
        <button
          onClick={onFaleTurma}
          className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#4354A0] hover:bg-[#F0F1FA] transition-colors active:scale-95 shadow-sm"
          aria-label="Fale para turma"
        >
          <Upload size={14} />
          <span className="hidden xs:inline">Fale para turma</span>
        </button>
      </div>

      {/* Descrição da disciplina */}
      <p className="text-sm text-gray-500 leading-relaxed">{descricao}</p>
    </div>
  );
}
