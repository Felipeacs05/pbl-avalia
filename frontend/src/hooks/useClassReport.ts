// src/hooks/useClassReport.ts
import { useEffect, useState } from "react";
import type { ClassReport } from "../types/report";
import { reportService } from "../services/reportService";

// Lê a mensagem tanto de Error quanto do contrato { status, message } do service
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : "Não foi possível carregar o relatório final.";
}

// Carrega uma vez o relatório final da sala; sob erro, não expõe relatório nenhum
export function useClassReport(roomId: string) {
  const [report, setReport] = useState<ClassReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    reportService
      .fetchClassReport(roomId)
      .then((data) => {
        if (isActive) setReport(data);
      })
      .catch((err: unknown) => {
        if (isActive) {
          setReport(null);
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [roomId]);

  return { report, isLoading, error };
}
