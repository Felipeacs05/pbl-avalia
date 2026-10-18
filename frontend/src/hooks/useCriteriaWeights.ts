// src/hooks/useCriteriaWeights.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Criterion, CriterionWeight } from "../types/performanceTable";
import { performanceTableService } from "../services/performanceTableService";

export function useCriteriaWeights(performanceTableId: string) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    performanceTableService
      .fetchPerformanceTable(performanceTableId)
      .then((table) => {
        if (isMounted) {
          setCriteria(table.criteriaList);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            typeof err === "object" && err !== null && "message" in err
              ? String(err.message)
              : "Erro ao carregar tabela de desempenho."
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [performanceTableId]);

  const saveWeights = useCallback(
    async (weights: CriterionWeight[]): Promise<void> => {
      try {
        await performanceTableService.updateCriteriaWeights(
          performanceTableId,
          weights
        );
        const refetched = await performanceTableService.fetchPerformanceTable(
          performanceTableId
        );
        setCriteria(refetched.criteriaList);
        setError(null);
      } catch (err) {
        const message =
          typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Erro ao salvar pesos.";
        setError(message);
      }
    },
    [performanceTableId]
  );

  return {
    criteria,
    isLoading,
    error,
    saveWeights,
  };
}
