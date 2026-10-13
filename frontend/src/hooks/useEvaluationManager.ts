// src/hooks/useEvaluationManager.ts
import { useState, useEffect, useCallback } from "react";
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { evaluationService } from "../services/evaluationService";

export function useEvaluationManager(problemId: string) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus>({
    problemId,
    activeType: null,
    isReleased: false,
  });
  const [selectedType, setSelectedType] = useState<EvaluationType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await evaluationService.getEvaluationStatus(problemId);
      setEvaluationStatus(status);
      setSelectedType(status.activeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evaluation status");
    } finally {
      setIsLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const openModal = useCallback(() => {
    // Synchronize pending selection with the currently released type
    setSelectedType(evaluationStatus.activeType);
    setIsModalOpen(true);
  }, [evaluationStatus.activeType]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Mutually exclusive toggle:
   * - Toggling an already selected type deselects it (null).
   * - Toggling a different type unchecks the previous and selects the new one.
   */
  const toggleType = useCallback((type: "self_evaluation" | "peer_evaluation") => {
    setSelectedType((current) => (current === type ? null : type));
  }, []);

  /**
   * Confirms and persists the selected evaluation release.
   */
  const confirmRelease = useCallback(async (): Promise<EvaluationStatus | null> => {
    try {
      setIsSubmitting(true);
      setError(null);
      const updatedStatus = await evaluationService.releaseEvaluation(
        problemId,
        selectedType
      );
      setEvaluationStatus(updatedStatus);
      setIsModalOpen(false);
      return updatedStatus;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release evaluation");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [problemId, selectedType]);

  return {
    isModalOpen,
    evaluationStatus,
    selectedType,
    isLoading,
    isSubmitting,
    error,
    openModal,
    closeModal,
    toggleType,
    setSelectedType,
    confirmRelease,
    refreshStatus: fetchStatus,
  };
}
