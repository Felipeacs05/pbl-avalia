// src/hooks/useDiscipline.ts
import { useState, useEffect, useCallback } from "react";
import type { Discipline } from "../types/discipline";
import { gradeMock } from "../mocks/grade.mock";
import { USE_REAL_API } from "../services/apiMode";
import { problemService } from "../services/problemService";
import { roomService } from "../services/roomService";
import { mapDisciplineFromRoomAndProblems } from "../services/mappers";

/**
 * Hook para buscar a estrutura de disciplina/problemas de uma sala específica.
 * No modelo real do backend, `Room` detém diretamente a lista de `Problem`s.
 */
export function useDiscipline(roomId: string, disciplineId: string) {
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiscipline = useCallback(async (): Promise<Discipline | null> => {
    if (!USE_REAL_API) {
      return new Promise<Discipline | null>((resolve) => {
        setTimeout(() => {
          const found = gradeMock.find(
            (d) => d.id === disciplineId && d.roomId === roomId
          );
          resolve(found ?? null);
        }, 400);
      });
    }

    try {
      const [room, problems] = await Promise.all([
        roomService.fetchRoomById(roomId).catch(() => null),
        problemService.fetchProblems(roomId).catch(() => []),
      ]);
      return mapDisciplineFromRoomAndProblems(room, roomId, problems);
    } catch {
      return mapDisciplineFromRoomAndProblems(null, roomId, []);
    }
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
 * Hook para listar a disciplina (container de problemas) da sala.
 */
export function useDisciplines(roomId: string) {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDisciplines = useCallback(async (): Promise<Discipline[]> => {
    if (!USE_REAL_API) {
      return new Promise<Discipline[]>((resolve) => {
        setTimeout(() => {
          const found = gradeMock.filter((d) => d.roomId === roomId);
          resolve(found);
        }, 400);
      });
    }

    try {
      const [room, problems] = await Promise.all([
        roomService.fetchRoomById(roomId).catch(() => null),
        problemService.fetchProblems(roomId).catch(() => []),
      ]);
      return [mapDisciplineFromRoomAndProblems(room, roomId, problems)];
    } catch {
      return [mapDisciplineFromRoomAndProblems(null, roomId, [])];
    }
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

  const refetch = useCallback(async () => {
    setDisciplines(await fetchDisciplines());
  }, [fetchDisciplines]);

  return { disciplines, isLoading, refetch };
}
