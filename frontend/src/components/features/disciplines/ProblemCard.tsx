import React from "react";
import type { Problem } from "../../../types/discipline";
import { IconButton } from "../../ui/IconButton";
import { BarChart3, Edit, Trash2 } from "lucide-react";

// src/components/features/disciplines/ProblemCard.tsx

interface ProblemCardProps {
  problem: Problem;
  onViewStats?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProblemCard({
  problem,
  onViewStats,
  onEdit,
  onDelete,
}: ProblemCardProps) {
  return (
    <div className="bg-[#4354A0] text-white p-5 rounded-[1.5rem] shadow-md cursor-pointer hover:bg-[#3b4b8f] transition-all active:scale-[0.98]">
      <h3 className="text-lg font-bold mb-1 tracking-wide">
        {problem.title}
      </h3>
      <p className="text-sm text-gray-200/80 mb-4 leading-relaxed">
        {problem.description}
      </p>

      <div className="flex justify-end gap-2">
        <IconButton
          aria-label="Statistics"
          icon={<BarChart3 size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onViewStats?.();
          }}
        />
        <IconButton
          aria-label="Edit problem"
          icon={<Edit size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        />
        <IconButton
          aria-label="Delete problem"
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
