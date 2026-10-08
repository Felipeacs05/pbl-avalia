import React from "react";
import type { Problema } from "../../../types/disciplina";
import { IconButton } from "../../ui/IconButton";
import { BarChart3, Edit, Trash2 } from "lucide-react";

// src/components/features/disciplinas/ProblemCard.tsx

interface ProblemCardProps {
  problema: Problema;
  onViewStats?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProblemCard({
  problema,
  onViewStats,
  onEdit,
  onDelete,
}: ProblemCardProps) {
  return (
    <div className="bg-[#4354A0] text-white p-5 rounded-[1.5rem] shadow-md cursor-pointer hover:bg-[#3b4b8f] transition-all active:scale-[0.98]">
      <h3 className="text-lg font-bold mb-1 tracking-wide">
        {problema.titulo}
      </h3>
      <p className="text-sm text-gray-200/80 mb-4 leading-relaxed">
        {problema.descricao}
      </p>

      <div className="flex justify-end gap-2">
        <IconButton
          aria-label="Estatísticas"
          icon={<BarChart3 size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onViewStats?.();
          }}
        />
        <IconButton
          aria-label="Editar problema"
          icon={<Edit size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        />
        <IconButton
          aria-label="Excluir problema"
          icon={<Trash2 size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        />
      </div>
    </div>
  );
}
