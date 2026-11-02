// src/components/features/reports/WithdrawnStudentsTable.tsx
"use client";

import React from "react";
import type { ProblemSummary, WithdrawnStudentRow } from "../../../types/report";
import { EMPTY_VALUE_TITLE, formatGrade } from "./reportFormat";

interface WithdrawnStudentsTableProps {
  problems: ProblemSummary[];
  students: WithdrawnStudentRow[];
}

const TH = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600 whitespace-nowrap";
const TD = "px-4 py-3 text-sm text-gray-700 whitespace-nowrap";

// Alunos que trancaram ou cancelaram o vínculo: à parte, com a média parcial devolvida pela API
export function WithdrawnStudentsTable({ problems, students }: WithdrawnStudentsTableProps) {
  if (students.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-gray-700">Alunos com vínculo encerrado</h3>
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table aria-label="Alunos com vínculo encerrado" className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className={TH}>Aluno</th>
              {problems.map((problem) => (
                <th key={problem.id} scope="col" className={TH}>{problem.title}</th>
              ))}
              <th scope="col" className={TH}>Média parcial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr key={student.studentId}>
                <th scope="row" className={`${TD} font-semibold text-left`}>{student.studentName}</th>
                {problems.map((problem) => {
                  const grade = student.gradesByProblem[problem.id];
                  return (
                    <td key={problem.id} className={TD} title={grade === undefined ? EMPTY_VALUE_TITLE : undefined}>
                      {formatGrade(grade)}
                    </td>
                  );
                })}
                <td className={`${TD} font-bold`}>{formatGrade(student.partialAverage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
