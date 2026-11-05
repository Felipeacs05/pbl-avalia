import { useState, useEffect } from "react";
import type { Problem } from "@/types/discipline";
import { problemService } from "@/services/problemService";

export function useProblems(roomId: string) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // isLoading starts as true; setState only happens inside promise callbacks
  // (never synchronously in the effect body) — avoids react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    problemService
      .fetchProblems(roomId)
      .then((data) => {
        if (!cancelled) {
          setProblems(data ?? []);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const createProblem = async (title: string, description = "") => {
    try {
      const created = await problemService.createProblem(roomId, { title, description });
      const reloaded = await problemService.fetchProblems(roomId);
      setProblems(reloaded ?? [...problems, created]);
      setError(null);
      return created;
    } catch (err: unknown) {
      setError(err);
      return null;
    }
  };

  const updateProblem = async (problemId: string, title: string, description = "") => {
    try {
      const updated = await problemService.updateProblem(problemId, { title, description });
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
