// src/components/features/attendance/EvaluationStudentList.tsx
"use client";

import React from "react";
import type { SessionStudent } from "../../../types/attendance";
import { EvaluationStudentRow } from "./EvaluationStudentRow";

interface EvaluationStudentListProps {
  students: SessionStudent[];
  onConfigureEvaluation?: (student: SessionStudent) => void;
}

export function EvaluationStudentList({
  students,
  onConfigureEvaluation,
}: EvaluationStudentListProps) {
  if (students.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-500">
        Nenhum aluno nesta sessão para avaliar.
      </p>
    );
  }

  return (
    <ul role="list" className="w-full flex flex-col gap-3 list-none p-0 m-0">
      {students.map((student) => (
        <EvaluationStudentRow
          key={student.id}
          student={student}
          onConfigureEvaluation={onConfigureEvaluation}
        />
      ))}
    </ul>
  );
}
