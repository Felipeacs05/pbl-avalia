// src/hooks/useSessionGrades.ts
"use client";

import { useEffect, useState } from "react";
import type { SessionGradesStatus } from "../types/session";
import { sessionGradesService } from "../services/sessionGradesService";

// Quais alunos da sessão já têm as notas publicadas, e as ações de publicar/atualizar e despublicar.
export function useSessionGrades(sessionId: string) {
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    sessionGradesService
      .getStatus(sessionId)
      .then((status) => {
        if (mounted) setPublishedIds(new Set(status.publishedStudentIds));
      })
      .catch(() => {
        // sem resposta, nada aparece como publicado
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  // Em erro, lança para a tela mostrar a falha
  const run = async (action: () => Promise<SessionGradesStatus>) => {
    setIsSubmitting(true);
    try {
      const status = await action();
      setPublishedIds(new Set(status.publishedStudentIds));
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishGrades = (studentIds: string[]) =>
    run(() => sessionGradesService.publishGrades(sessionId, studentIds));
  const unpublishGrades = (studentIds: string[]) =>
    run(() => sessionGradesService.unpublishGrades(sessionId, studentIds));

  return { publishedIds, isLoading, isSubmitting, publishGrades, unpublishGrades };
}
