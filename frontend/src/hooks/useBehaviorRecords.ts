// src/hooks/useBehaviorRecords.ts
import { useEffect, useState } from "react";
import type { BehaviorRecord, BehaviorRecordInput, BehaviorTag } from "../types/behaviorRecord";
import { behaviorRecordService } from "../services/behaviorRecordService";

const FALLBACK_ERROR = "Não foi possível registrar o comportamento. Tente novamente.";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string" && message) return message;
  }
  return FALLBACK_ERROR;
}

/** Tags predefinidas (carregadas uma vez) e registro de comportamento do aluno na sessão. */
export function useBehaviorRecords(sessionId: string) {
  const [tags, setTags] = useState<BehaviorTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<BehaviorRecord | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadTags() {
      try {
        const data = await behaviorRecordService.fetchBehaviorTags();
        if (mounted) setTags(data);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadTags();
    return () => {
      mounted = false;
    };
  }, []);

  // true = salvou (a tela pode fechar o painel); false = recusado (o painel fica aberto com o erro)
  const registerBehavior = async (studentId: string, input: BehaviorRecordInput): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await behaviorRecordService.createBehaviorRecord(sessionId, studentId, input);
      setLastRecord(saved);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const clearError = () => setError(null);

  return { tags, isLoading, isSaving, error, lastRecord, registerBehavior, clearError };
}
