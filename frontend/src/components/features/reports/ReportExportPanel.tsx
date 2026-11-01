// src/components/features/reports/ReportExportPanel.tsx
"use client";

import React from "react";
import { CheckCircle2, Download } from "lucide-react";
import { useReportExport } from "../../../hooks/useReportExport";
import type { ReportScope } from "../../../types/reportExport";
import { ReportExportActions } from "./ReportExportActions";

export interface ReportExportPanelProps {
  scope: ReportScope;
  title?: string;
  description?: string;
  className?: string;
}

function getDefaultScopeHeading(scope: ReportScope): {
  title: string;
  description: string;
} {
  switch (scope.type) {
    case "class":
      return {
        title: "Exportar Relatório Final da Turma",
        description:
          "Baixe o consolidado de notas por problema e a média ponderada geral da disciplina em PDF ou Planilha.",
      };
    case "problem":
      return {
        title: "Exportar Relatório Parcial do Problema",
        description:
          "Baixe o desempenho compilado dos alunos neste problema em PDF ou Planilha.",
      };
    case "session":
      return {
        title: "Exportar Relatório da Sessão",
        description:
          "Baixe a lista de presença, funções e notas desta sessão em PDF ou Planilha.",
      };
  }
}

export function ReportExportPanel({
  scope,
  title,
  description,
  className = "",
}: ReportExportPanelProps) {
  const { isGenerating, error, isSuccess, exportReport } =
    useReportExport(scope);
  const defaults = getDefaultScopeHeading(scope);

  return (
    <section
      aria-label={title ?? defaults.title}
      className={`w-full bg-white border border-gray-200 rounded-[1.5rem] p-5 sm:p-6 shadow-xs flex flex-col gap-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            aria-hidden="true"
            className="w-11 h-11 rounded-2xl bg-[#EEF1FB] text-[#4354A0] flex items-center justify-center shrink-0"
          >
            <Download size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base sm:text-lg font-bold text-[#182860] leading-snug">
              {title ?? defaults.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-relaxed">
              {description ?? defaults.description}
            </p>
          </div>
        </div>

        {isSuccess && !isGenerating && !error && (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 self-start sm:self-center">
            <CheckCircle2 size={15} aria-hidden="true" className="shrink-0" />
            <span>Relatório extraído com sucesso</span>
          </div>
        )}
      </div>

      <ReportExportActions
        onExport={exportReport}
        isGenerating={isGenerating}
        error={error}
        variant="panel"
      />
    </section>
  );
}
