// src/hooks/useReportExport.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { reportExportService } from "../services/reportExportService";
import { downloadFile } from "../utils/downloadFile";
import type { ExportFormat, ReportScope } from "../types/reportExport";

function getErrorMessage(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return "Não foi possível gerar o relatório. Tente novamente.";
}

export interface UseReportExportReturn {
  isGenerating: boolean;
  error: string | null;
  isSuccess: boolean;
  exportReport: (format: ExportFormat) => Promise<boolean>;
  resetStatus: () => void;
}

export function useReportExport(scope: ReportScope): UseReportExportReturn {
  const inFlightRef = useRef<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const exportReport = useCallback(
    async (format: ExportFormat): Promise<boolean> => {
      if (inFlightRef.current) {
        return false;
      }

      inFlightRef.current = true;
      setIsGenerating(true);
      setError(null);
      setIsSuccess(false);

      try {
        const exportedFile = await reportExportService.exportReport(
          scope,
          format
        );
        downloadFile(exportedFile);
        setIsSuccess(true);
        return true;
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        inFlightRef.current = false;
        setIsGenerating(false);
      }
    },
    [scope]
  );

  const resetStatus = useCallback(() => {
    setError(null);
    setIsSuccess(false);
  }, []);

  return {
    isGenerating,
    error,
    isSuccess,
    exportReport,
    resetStatus,
  };
}
