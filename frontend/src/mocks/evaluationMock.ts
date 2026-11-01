// src/mocks/evaluationMock.ts
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { getReleasedTypes } from "../types/evaluation";

/**
 * In-memory storage to simulate persistent evaluations per problem during the session.
 */
export const initialEvaluationStatuses: Record<string, EvaluationStatus> = {
  prob_1: {
    problemId: "prob_1",
    activeType: "self_evaluation",
    isReleased: true,
    releasedAt: new Date().toISOString(),
  },
  prob_2: {
    problemId: "prob_2",
    activeType: null,
    isReleased: false,
  },
  prob_3: {
    problemId: "prob_3",
    activeType: "peer_evaluation",
    isReleased: true,
    releasedAt: new Date().toISOString(),
  },
};

const inMemoryEvaluationStore = new Map<string, EvaluationStatus>(
  Object.entries(initialEvaluationStatuses)
);

export const evaluationMock = {
  /**
   * Retrieves the current evaluation status for a given problem ID.
   */
  getStatus(problemId: string): EvaluationStatus {
    const existing = inMemoryEvaluationStore.get(problemId);
    if (existing) {
      return { ...existing, activeTypes: getReleasedTypes(existing) };
    }

    // Default status if problem has no record yet
    const defaultStatus: EvaluationStatus = {
      problemId,
      activeType: null,
      isReleased: false,
    };
    inMemoryEvaluationStore.set(problemId, defaultStatus);
    return { ...defaultStatus };
  },

  /**
   * Updates or releases an evaluation for a given problem ID.
   * keepOthers: mantém as avaliações já liberadas (para liberar as duas juntas); sem ele, substitui.
   */
  saveStatus(problemId: string, activeType: EvaluationType, keepOthers = false): EvaluationStatus {
    const current = keepOthers ? evaluationMock.getStatus(problemId).activeTypes ?? [] : [];
    const activeTypes = activeType === null
      ? []
      : [...current.filter((type) => type !== activeType), activeType];
    const updatedStatus: EvaluationStatus = {
      problemId,
      activeType,
      activeTypes,
      isReleased: activeTypes.length > 0,
      releasedAt: activeTypes.length > 0 ? new Date().toISOString() : undefined,
    };

    inMemoryEvaluationStore.set(problemId, updatedStatus);
    return { ...updatedStatus, activeTypes: [...activeTypes] };
  },

  /**
   * Clears or resets mock data (useful for test environments).
   */
  reset(): void {
    inMemoryEvaluationStore.clear();
    Object.entries(initialEvaluationStatuses).forEach(([k, v]) => {
      inMemoryEvaluationStore.set(k, { ...v });
    });
  },
};
