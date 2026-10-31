// src/services/evaluationService.ts
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { evaluationMock } from "../mocks/evaluationMock";
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/problems";

export const evaluationService = {
  /**
   * Fetches the current evaluation status for a specific problem.
   */
  async getEvaluationStatus(problemId: string): Promise<EvaluationStatus> {
    if (!USE_REAL_API) {
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
    if (!USE_REAL_API) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const updated = evaluationMock.saveStatus(problemId, type);
          resolve(updated);
        }, 450);
      });
    }

    try {
      if (type === "self_evaluation") {
        await fetch(`${BASE_URL}/${problemId}/self-assessment-release`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
      } else if (type === "peer_evaluation") {
        await fetch(`${BASE_URL}/${problemId}/peer-assessment-release`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
      }
      return evaluationMock.saveStatus(problemId, type);
    } catch {
      return evaluationMock.saveStatus(problemId, type);
    }
  },

  async toggleSelfAssessmentRelease(problemId: string): Promise<void> {
    if (!USE_REAL_API) return;
    await fetch(`${BASE_URL}/${problemId}/self-assessment-release`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
  },

  async togglePeerAssessmentRelease(problemId: string): Promise<void> {
    if (!USE_REAL_API) return;
    await fetch(`${BASE_URL}/${problemId}/peer-assessment-release`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
  },
};
