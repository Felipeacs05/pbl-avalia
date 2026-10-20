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

  const refreshStatus = useCallback(async () => {
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
    let isMounted = true;

    async function loadInitialStatus() {
      try {
        const status = await evaluationService.getEvaluationStatus(problemId);
        if (isMounted) {
          setEvaluationStatus(status);
          setSelectedType(status.activeType);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load evaluation status");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialStatus();

    return () => {
      isMounted = false;
    };
  }, [problemId]);

  const openModal = useCallback(() => {
    setSelectedType(evaluationStatus.activeType);
    setIsModalOpen(true);
  }, [evaluationStatus.activeType]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleType = useCallback((type: "self_evaluation" | "peer_evaluation") => {
    setSelectedType((current) => (current === type ? null : type));
  }, []);

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
    refreshStatus,
  };
}