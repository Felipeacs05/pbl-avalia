// src/services/problemService.ts
import type { ProblemDetails } from "../types/problem";
import { problemDetailsMock } from "../mocks/problem.mock";

const BASE_URL = "/api/v1/problems";
const IS_TEST = process.env.NODE_ENV === "test";

export const problemService = {
  async fetchProblemDetails(problemId: string): Promise<ProblemDetails | null> {
    if (!IS_TEST) {
      return new Promise((resolve) =>
        setTimeout(() => {
          const found = problemDetailsMock[problemId] ?? null;
          resolve(found);
        }, 400)
      );
    }
    const response = await fetch(`${BASE_URL}/${problemId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    return response.json();
  },

  async startSession(problemId: string): Promise<{ sessionId: string }> {
    if (!IS_TEST) {
      return new Promise((resolve) =>
        setTimeout(() => {
          const sessionId = `session_${Date.now()}`;
          resolve({ sessionId });
        }, 600)
      );
    }
    const response = await fetch(`${BASE_URL}/${problemId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  async releaseSelfEvaluation(problemId: string): Promise<void> {
    if (!IS_TEST) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    await fetch(`${BASE_URL}/${problemId}/self-evaluation/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },
};
