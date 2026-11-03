// src/components/features/behavior-records/BehaviorStudentList.tsx
"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import type { BehaviorStudent } from "../../../types/behaviorRecord";

interface BehaviorStudentListProps {
  students: BehaviorStudent[];
  onSelectStudent: (studentId: string) => void;
}

// 1º toque do registro rápido: escolher o aluno
export function BehaviorStudentList({ students, onSelectStudent }: BehaviorStudentListProps) {
  return (
    <ul className="flex flex-col gap-2.5 list-none p-0">
      {students.map((student) => (
        <li key={student.id}>
          <button
            type="button"
            onClick={() => onSelectStudent(student.id)}
            className="w-full min-h-11 min-w-11 bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3 text-left text-sm font-bold text-gray-900 shadow-xs hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer"
          >
            {student.name}
            <ChevronRight size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
