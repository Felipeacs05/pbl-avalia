// src/hooks/useSessionRoster.ts
import { useEffect, useState } from "react";
import type { SessionRoster } from "../types/session";
import { attendanceService } from "../services/attendanceService";

const SESSION_TIME_ZONE = "America/Sao_Paulo";

/** "2026-03-24T15:00:00Z" -> "24/03" (fuso de Brasília). */
function formatDayMonth(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: SESSION_TIME_ZONE,
  }).format(new Date(isoDate));
}

export function useSessionRoster(sessionId: string) {
  const [roster, setRoster] = useState<SessionRoster | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const data = await attendanceService.fetchSessionRoster(sessionId);
        if (mounted) setRoster(data);
      } catch {
        if (mounted) setError("Não foi possível carregar os alunos da sessão.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return {
    roster,
    dateLabel: roster ? formatDayMonth(roster.date) : "",
    isLoading,
    error,
  };
}
