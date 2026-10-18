// src/hooks/useDiscipline.ts
import { useState, useEffect, useCallback } from "react";
import type { Discipline } from "../types/discipline";
import { gradeMock } from "../mocks/grade.mock";

/**
 * Hook to fetch a specific discipline from a room.
 * Currently uses mock data; will consume the API in the future.
 */
export function useDiscipline(roomId: string, disciplineId: string) {
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiscipline = useCallback(async () => {
    return new Promise<Discipline | null>((resolve) => {
      setTimeout(() => {
        const found = gradeMock.find(
          (d) => d.id === disciplineId && d.roomId === roomId
        );
        resolve(found ?? null);
      }, 400);
    });
  }, [roomId, disciplineId]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const data = await fetchDiscipline();
      if (mounted) {
        setDiscipline(data);
        setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [fetchDiscipline]);

  return { discipline, isLoading };
}

/**
 * Hook to list all disciplines of a room.
 */
export function useDisciplines(roomId: string) {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDisciplines = useCallback(async () => {
    return new Promise<Discipline[]>((resolve) => {
      setTimeout(() => {
        const found = gradeMock.filter((d) => d.roomId === roomId);
        resolve(found);
      }, 400);
    });
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const data = await fetchDisciplines();
      if (mounted) {
        setDisciplines(data);
        setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [fetchDisciplines]);

  return { disciplines, isLoading };
}
