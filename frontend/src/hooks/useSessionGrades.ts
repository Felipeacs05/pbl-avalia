// src/hooks/useSessionGrades.ts
"use client";

import { useCallback, useEffect, useState } from "react";
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
  const run = useCallback(
    async (action: (studentIds: string[]) => ReturnType<typeof sessionGradesService.publishGrades>, studentIds: string[]) => {
      setIsSubmitting(true);
      try {
        const status = await action(studentIds);
        setPublishedIds(new Set(status.publishedStudentIds));
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const publishGrades = useCallback(
    (studentIds: string[]) => run((ids) => sessionGradesService.publishGrades(sessionId, ids), studentIds),
    [run, sessionId]
  );
  const unpublishGrades = useCallback(
    (studentIds: string[]) => run((ids) => sessionGradesService.unpublishGrades(sessionId, ids), studentIds),
    [run, sessionId]
  );

  return { publishedIds, isLoading, isSubmitting, publishGrades, unpublishGrades };
}
