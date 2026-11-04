import { useState, useEffect, useCallback } from "react";
import type { Problem } from "@/types/discipline";
import { problemService } from "@/services/problemService";

export function useProblems(roomId: string) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadProblems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await problemService.fetchProblems(roomId);
      setProblems(data ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const createProblem = async (title: string) => {
    try {
      const created = await (problemService.createProblem as any)(roomId, title);
      const reloaded = await problemService.fetchProblems(roomId);
      setProblems(reloaded ?? [...problems, created]);
      setError(null);
      return created;
    } catch (err: unknown) {
      setError(err);
      return null;
    }
  };

  const updateProblem = async (problemId: string, title: string) => {
    try {
      const updated = await (problemService.updateProblem as any)(problemId, title);
      const reloaded = await problemService.fetchProblems(roomId);
      setProblems(reloaded ?? problems.map((p) => (p.id === problemId ? { ...p, title } : p)));
      setError(null);
      return updated;
    } catch (err: unknown) {
      setError(err);
      return null;
    }
  };

  const deleteProblem = async (problemId: string) => {
    try {
      await problemService.deleteProblem(problemId);
      const reloaded = await problemService.fetchProblems(roomId);
      setProblems(reloaded ?? problems.filter((p) => p.id !== problemId));
      setError(null);
    } catch (err: unknown) {
      setError(err);
      return null;
    }
  };

  return { problems, isLoading, error, createProblem, updateProblem, deleteProblem };
}
