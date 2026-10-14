// src/hooks/useProblemDetails.ts
import { useState, useEffect, useCallback } from "react";
import type { ProblemDetails } from "../types/problem";
import { problemService } from "../services/problemService";

export function useProblemDetails(problemId: string) {
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isReleasingEvaluation, setIsReleasingEvaluation] = useState(false);

  const fetchProblem = useCallback(async () => {
    return problemService.fetchProblemDetails(problemId);
  }, [problemId]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setIsLoading(true);
      const data = await fetchProblem();
      if (mounted) {
        setProblem(data);
        setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [fetchProblem]);

  const startSession = useCallback(async () => {
    setIsStartingSession(true);
    try {
      const result = await problemService.startSession(problemId);
      return result;
    } finally {
      setIsStartingSession(false);
    }
  }, [problemId]);

  const releaseSelfEvaluation = useCallback(async () => {
    setIsReleasingEvaluation(true);
    try {
      await problemService.releaseSelfEvaluation(problemId);
    } finally {
      setIsReleasingEvaluation(false);
    }
  }, [problemId]);

  return {
    problem,
    isLoading,
    isStartingSession,
    isReleasingEvaluation,
    startSession,
    releaseSelfEvaluation,
  };
}
