import { useState, useEffect, useCallback } from "react";
import { problemService } from "@/services/problemService";
import type { Problem } from "@/types/problem";

export function useProblems(roomId: string) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProblems = useCallback(async () => {
    try {
      const data = await problemService.fetchProblems(roomId);
      setProblems(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const createProblem = async (title: string) => {
    setError(null);
    await problemService.createProblem(roomId, title);
    await loadProblems();
  };

  const updateProblem = async (id: string, title: string) => {
    setError(null);
    try {
      await problemService.updateProblem(id, title);
      await loadProblems();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 403) {
        setError("Apenas o tutor da sala pode editar problemas.");
      } else {
        setError("Falha ao editar o problema.");
      }
    }
  };

  const deleteProblem = async (id: string) => {
    setError(null);
    await problemService.deleteProblem(id);
    await loadProblems();
  };

  return {
    problems,
    isLoading,
    error,
    createProblem,
    updateProblem,
    deleteProblem,
  };
}
