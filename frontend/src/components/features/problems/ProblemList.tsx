import React from "react";
import type { Problem } from "@/types/discipline";

interface ProblemListProps {
  problems: Problem[];
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
}

export function ProblemList({ problems, onEdit, onDelete }: ProblemListProps) {
  return (
    <ol className="space-y-3">
      {problems.map((problem) => (
        <li key={problem.id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
          <span className="font-semibold text-gray-800">{problem.title}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(problem)}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(problem)}
              className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 rounded-lg text-red-600"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

