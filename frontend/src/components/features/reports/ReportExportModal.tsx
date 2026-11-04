// src/components/features/reports/ReportExportModal.tsx
"use client";

import React from "react";
import { CheckCircle2, Download, X } from "lucide-react";
import { useReportExport } from "../../../hooks/useReportExport";
import type { ReportScope } from "../../../types/reportExport";
import { ReportExportActions } from "./ReportExportActions";

export interface ReportExportModalProps {
  scope: ReportScope;
  isOpen?: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

function getModalScopeText(scope: ReportScope): {
  title: string;
  subtitle: string;
} {
  switch (scope.type) {
    case "class":
      return {
        title: "Exportar Relatório da Turma",
        subtitle:
          "Extraia o relatório final consolidado com as notas por problema e a média ponderada geral.",
      };
    case "problem":
      return {
        title: "Exportar Relatório do Problema",
        subtitle:
          "Extraia o relatório parcial com o compilado de notas e frequência deste problema.",
      };
    case "session":
      return {
        title: "Exportar Relatório da Sessão",
        subtitle:
          "Extraia o relatório individual com a chamada e as avaliações desta sessão.",
      };
  }
}

export function ReportExportModal({
  scope,
  isOpen = true,
  title,
  subtitle,
  onClose,
}: ReportExportModalProps) {
  const { isGenerating, error, isSuccess, exportReport } =
    useReportExport(scope);

  if (!isOpen) return null;

  const defaults = getModalScopeText(scope);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) {
          onClose();
        }
      }}
      data-testid="report-export-modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-export-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#4354A0] text-white w-full max-w-lg rounded-[1.75rem] p-6 sm:p-8 shadow-2xl relative flex flex-col gap-5"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isGenerating}
          aria-label="Fechar modal de exportação"
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3.5 pr-8">
          <div
            aria-hidden="true"
            className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center shrink-0"
          >
            <Download size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col text-left">
            <h2
              id="report-export-modal-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-white"
            >
              {title ?? defaults.title}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed">
              {subtitle ?? defaults.subtitle}
            </p>
          </div>
        </div>

        {isSuccess && !isGenerating && !error && (
          <div className="w-full rounded-xl bg-emerald-500/20 border border-emerald-300/40 px-4 py-3 flex items-center justify-between gap-3 text-emerald-100 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} aria-hidden="true" className="shrink-0" />
              <span>
                Relatório extraído! Verifique sua pasta de downloads.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        <ReportExportActions
          onExport={exportReport}
          isGenerating={isGenerating}
          error={error}
          variant="modal"
        />
      </div>
    </div>
  );
}
