// src/services/evaluationService.ts
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { evaluationMock } from "../mocks/evaluationMock";

const BASE_URL = "/api/v1/problems";
const IS_TEST = process.env.NODE_ENV === "test";

export const evaluationService = {
  /**
   * Fetches the current evaluation status for a specific problem.
   */
  async getEvaluationStatus(problemId: string): Promise<EvaluationStatus> {
    if (!IS_TEST) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const status = evaluationMock.getStatus(problemId);
          resolve(status);
        }, 350);
      });
    }

    // Future backend integration
    try {
      const response = await fetch(`${BASE_URL}/${problemId}/evaluation-status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        return evaluationMock.getStatus(problemId);
      }
      return await response.json();
    } catch {
      return evaluationMock.getStatus(problemId);
    }
  },

  /**
   * Releases or updates the evaluation type for a specific problem.
   * If type is null, it revokes/un-releases the active evaluation.
   */
  async releaseEvaluation(
    problemId: string,
    type: EvaluationType
  ): Promise<EvaluationStatus> {
    if (!IS_TEST) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const updated = evaluationMock.saveStatus(problemId, type);
          resolve(updated);
        }, 450);
      });
    }

    // Future backend integration
    try {
      const response = await fetch(`${BASE_URL}/${problemId}/evaluations/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        return evaluationMock.saveStatus(problemId, type);
      }
      return await response.json();
    } catch {
      return evaluationMock.saveStatus(problemId, type);
    }
  },
};
