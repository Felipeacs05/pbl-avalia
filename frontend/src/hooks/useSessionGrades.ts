// src/hooks/useSessionGrades.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { sessionGradesService } from "../services/sessionGradesService";

// Situação das notas da sessão (abertas ou fechadas) e a ação de fechá-las.
export function useSessionGrades(sessionId: string) {
  const [isClosed, setIsClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let mounted = true;
    sessionGradesService
      .getStatus(sessionId)
      .then((status) => {
        if (mounted) setIsClosed(status.isClosed);
      })
      .catch(() => {
        // sem resposta, a sessão segue aberta (o back-end ainda recusa alteração em sessão fechada)
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  // Devolve true se fechou; em erro, lança para o modal de confirmação mostrar a falha
  const closeGrades = useCallback(async (): Promise<void> => {
    setIsClosing(true);
    try {
      const status = await sessionGradesService.closeGrades(sessionId);
      setIsClosed(status.isClosed);
    } finally {
      setIsClosing(false);
    }
  }, [sessionId]);

  return { isClosed, isLoading, isClosing, closeGrades };
}
