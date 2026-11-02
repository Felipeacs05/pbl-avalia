// src/components/features/reports/ClassReportTable.tsx
"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { ClassReport } from "../../../types/report";
import { EMPTY_VALUE, EMPTY_VALUE_TITLE, formatGrade } from "./reportFormat";

interface ClassReportTableProps {
  report: ClassReport | null;
  isLoading: boolean;
  error: string | null;
}

const TH = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600 whitespace-nowrap";
const TD = "px-4 py-3 text-sm text-gray-800 whitespace-nowrap";

// Tabela dinâmica: uma coluna por problema da sala, na ordem do backend, entre o aluno e a média.
// A média é a ponderada devolvida pela API: a tela só formata, nunca recalcula.
export function ClassReportTable({ report, isLoading, error }: ClassReportTableProps) {
  if (isLoading) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        <span>Carregando relatório...</span>
      </div>
    );
  }

  // Sob erro (ex.: 403) nada do relatório é exibido
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        {error}
      </div>
    );
  }

  if (!report) return null;

  const isOpen = (problemId: string) => report.openProblemIds.includes(problemId);

  return (
    <div className="flex flex-col gap-3">
      {/* Avisos não são erro: o relatório continua na tela */}
      {report.warnings.map((warning, index) => (
        <p
          key={`${warning.code}-${warning.problemId ?? ""}-${index}`}
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{warning.message}</span>
        </p>
      ))}

      {report.students.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum aluno ativo nesta sala.</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table aria-label="Alunos ativos" className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#EEF0FA]">
              <tr>
                <th scope="col" className={TH}>Aluno</th>
                {report.problems.map((problem) => (
                  <th key={problem.id} scope="col" className={TH}>
                    {problem.title}
                    {isOpen(problem.id) && (
                      <span className="ml-1 font-semibold normal-case text-amber-700"> (em andamento)</span>
                    )}
                  </th>
                ))}
                <th scope="col" className={TH}>Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.students.map((student) => (
                <tr key={student.studentId}>
                  <th scope="row" className={`${TD} font-semibold text-left`}>{student.studentName}</th>
                  {report.problems.map((problem) => {
                    const grade = student.gradesByProblem[problem.id];
                    return (
                      <td key={problem.id} className={TD} title={grade === undefined ? EMPTY_VALUE_TITLE : undefined}>
                        {formatGrade(grade)}
                      </td>
                    );
                  })}
                  <td
                    className={`${TD} font-bold text-[#4354A0]`}
                    title={student.weightedAverage === null ? EMPTY_VALUE_TITLE : undefined}
                  >
                    {student.weightedAverage === null ? EMPTY_VALUE : formatGrade(student.weightedAverage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
