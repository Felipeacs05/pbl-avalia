// src/hooks/useDiscipline.ts
import { useState, useEffect, useCallback } from "react";
import type { Discipline, Problem } from "../types/discipline";
import { gradeMock } from "../mocks/grade.mock";
import { IS_TEST, USE_REAL_API } from "../services/apiMode";
import { authFetch } from "../services/authFetch";

async function fetchRealDisciplineData(roomId: string): Promise<Discipline | null> {
  try {
    const problemsRes = await authFetch(`/api/v1/rooms/${roomId}/problems`, { method: "GET" });
    const problemsData = problemsRes.ok ? await problemsRes.json() : [];

    let roomName = "Disciplina PBL";
    const roomRes = await authFetch(`/api/v1/rooms/${roomId}`, { method: "GET" });
    if (roomRes.ok) {
      const roomData = await roomRes.json();
      if (roomData.name) roomName = roomData.name;
    }

    const problems: Problem[] = Array.isArray(problemsData)
      ? problemsData.map((p: { id: string; title: string; description?: string }) => ({
          id: String(p.id),
          title: p.title,
          description: p.description || "",
        }))
      : [];

    return {
      id: roomId,
      name: roomName,
      description: "Problemas e sessões tutoriais da turma.",
      roomId: roomId,
      problems,
    };
  } catch {
    return null;
  }
}

/**
 * Hook to fetch a specific discipline from a room.
 */
export function useDiscipline(roomId: string, disciplineId: string) {
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiscipline = useCallback(async () => {
    if (!IS_TEST && USE_REAL_API) {
      const real = await fetchRealDisciplineData(roomId);
      if (real) return real;
    }
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
    if (!IS_TEST && USE_REAL_API) {
      const real = await fetchRealDisciplineData(roomId);
      if (real) return [real];
    }
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

  // recarrega a lista, exemplo: depois de excluir um problema
  const refetch = useCallback(async () => {
    setDisciplines(await fetchDisciplines());
  }, [fetchDisciplines]);

  return { disciplines, isLoading, refetch };
}
