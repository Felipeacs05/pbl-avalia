// src/components/features/reports/ReportExportActions.tsx
"use client";

import React from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { ExportFormat } from "../../../types/reportExport";

export interface ReportExportActionsProps {
  onExport: (format: ExportFormat) => void | Promise<unknown>;
  isGenerating: boolean;
  error: string | null;
  variant?: "panel" | "modal";
}

export function ReportExportActions({
  onExport,
  isGenerating,
  error,
  variant = "panel",
}: ReportExportActionsProps) {
  const handleSelectFormat = (format: ExportFormat) => {
    if (isGenerating) return;
    void onExport(format);
  };

  const isModal = variant === "modal";

  return (
    <div className="w-full flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className={
            isModal
              ? "w-full rounded-xl bg-red-500/20 border border-red-300/60 px-4 py-3 text-xs sm:text-sm font-semibold text-red-100 text-center"
              : "w-full rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-semibold text-red-700 text-center"
          }
        >
          {error}
        </div>
      )}

      {isGenerating && (
        <div
          role="status"
          aria-live="polite"
          className={
            isModal
              ? "w-full rounded-xl bg-[#2E3A70]/90 border border-white/20 px-4 py-3 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-2.5"
              : "w-full rounded-xl bg-[#EEF1FB] border border-[#C5CCE8] px-4 py-3 text-xs sm:text-sm font-semibold text-[#2E3A70] flex items-center justify-center gap-2.5"
          }
        >
          <Loader2
            size={18}
            aria-hidden="true"
            className="animate-spin shrink-0"
          />
          <span>Gerando documento, por favor aguarde...</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        <button
          type="button"
          disabled={isGenerating}
          onClick={() => handleSelectFormat("PDF")}
          className={
            isModal
              ? "w-full min-h-[46px] bg-white text-[#2E3A70] hover:bg-[#EEF1FB] py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              : "w-full min-h-[46px] bg-[#4354A0] hover:bg-[#364485] text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4354A0]"
          }
        >
          <FileText size={18} aria-hidden="true" className="shrink-0" />
          <span>Exportar Relatório em PDF</span>
        </button>

        <button
          type="button"
          disabled={isGenerating}
          onClick={() => handleSelectFormat("XLSX")}
          className={
            isModal
              ? "w-full min-h-[46px] bg-[#757DC3] hover:bg-[#6870B5] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              : "w-full min-h-[46px] bg-[#757DC3] hover:bg-[#646CB2] text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4354A0]"
          }
        >
          <FileSpreadsheet size={18} aria-hidden="true" className="shrink-0" />
          <span>Exportar Planilha (Excel)</span>
        </button>
      </div>
    </div>
  );
}
