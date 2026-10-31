"use client";

import React from "react";
import type { Problem } from "@/types/problem";

interface ProblemListProps {
  problems: Problem[];
  onEdit: (problem: Problem) => void;
  onDelete: (problem: Problem) => void;
}

export function ProblemList({ problems, onEdit, onDelete }: ProblemListProps) {
  return (
    <ol role="list" className="space-y-3 list-decimal list-inside">
      {problems.map((problem) => (
        <li
          key={problem.id}
          role="listitem"
          className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-between"
        >
          <span className="font-semibold text-gray-800">{problem.title}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(problem)}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(problem)}
              className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-md"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
