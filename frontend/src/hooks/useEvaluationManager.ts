import { useState, useEffect, useCallback, useRef } from "react";
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { evaluationService } from "../services/evaluationService";

type ReleasableType = "self_evaluation" | "peer_evaluation";

// Lê a mensagem tanto de Error quanto do contrato { status, message } dos services
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : fallback;
}

export function useEvaluationManager(problemId: string) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus>({
    problemId,
    activeType: null,
    isReleased: false,
  });
  const [selectedType, setSelectedType] = useState<EvaluationType>(null);
  // Tipos marcados no modal: as duas liberações são independentes, então os dois podem ir juntos
  const [selectedTypes, setSelectedTypes] = useState<ReleasableType[]>([]);
  // Só a resposta do último clique em "Liberar" atualiza a tela
  const lastRequestId = useRef(0);
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
      setSelectedTypes(status.activeType ? [status.activeType] : []);
    } catch (err) {
      setError(errorMessage(err, "Failed to load evaluation status"));
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
          setSelectedTypes(status.activeType ? [status.activeType] : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(errorMessage(err, "Failed to load evaluation status"));
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
    // Descarta o que foi marcado e não confirmado: volta ao que está gravado
    setSelectedType(evaluationStatus.activeType);
    setSelectedTypes(evaluationStatus.activeType ? [evaluationStatus.activeType] : []);
    setError(null);
    setIsModalOpen(true);
  }, [evaluationStatus.activeType]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleType = useCallback((type: ReleasableType) => {
    setSelectedType((current) => (current === type ? null : type));
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  }, []);

  const confirmRelease = useCallback(async (): Promise<EvaluationStatus | null> => {
    const requestId = ++lastRequestId.current;
    const isLatest = () => requestId === lastRequestId.current;
    try {
      setIsSubmitting(true);
      setError(null);
      // Nada marcado = desativa (null); senão, um envio por tipo marcado
      const types: EvaluationType[] = selectedTypes.length > 0 ? selectedTypes : [null];
      let updatedStatus: EvaluationStatus | null = null;
      for (const type of types) {
        updatedStatus = await evaluationService.releaseEvaluation(problemId, type);
      }
      if (isLatest() && updatedStatus) {
        setEvaluationStatus(updatedStatus);
        setIsModalOpen(false);
      }
      return updatedStatus;
    } catch (err) {
      if (isLatest()) setError(errorMessage(err, "Failed to release evaluation"));
      return null;
    } finally {
      if (isLatest()) setIsSubmitting(false);
    }
  }, [problemId, selectedTypes]);

  return {
    isModalOpen,
    evaluationStatus,
    selectedType,
    selectedTypes,
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