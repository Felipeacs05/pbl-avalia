// src/hooks/useCriteriaPreset.ts

// Estado da lista de critérios do Pré-set (US07).
// Adicionar, editar e remover mexem só no estado da tela (SPA, sem recarregar a página);
"use client";

import { useCallback, useEffect, useState } from "react";
import type { PresetCriterion } from "../types/performanceTable";
import { criteriaPresetService } from "../services/criteriaPresetService";

// Campos que o professor preenche no modal de adicionar/editar
export type CriterionInput = Pick<PresetCriterion, "name" | "weight">;

// Id local para critérios novos (o back-end real vai gerar o definitivo)
let newIdCounter = 0;
const createLocalId = () => `crit_new_${Date.now()}_${++newIdCounter}`;

// presetId: de quem é o pré-set (um problema, ou a sala na tela isolada)
export function useCriteriaPreset(presetId: string) {
  const [criteria, setCriteria] = useState<PresetCriterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // ativa o botão "Salvar Pre-set"
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    criteriaPresetService
      .fetchPreset(presetId)
      .then((data) => {
        if (mounted) setCriteria(data);
      })
      .catch(() => {
        if (mounted) setToast({ type: "error", message: "Não foi possível carregar os critérios." });
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [presetId]);

  // Critério novo entra na seção de opcionais (onde fica o botão "Adicionar Critério" no Figma)
  const addCriterion = useCallback((input: CriterionInput) => {
    setCriteria((prev) => [
      ...prev,
      { id: createLocalId(), name: input.name, weight: input.weight, isOptional: true, isRemovable: true },
    ]);
    setHasChanges(true);
  }, []);

  const updateCriterion = useCallback((id: string, input: CriterionInput) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
    setHasChanges(true);
  }, []);

  // Proteção extra: critério fixo (ex.: Papel) não sai nem se a função for chamada por engano
  const removeCriterion = useCallback((id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id || !c.isRemovable));
    setHasChanges(true);
  }, []);

  // Devolve true se salvou, para a tela decidir o próximo passo (ex.: ir para o problema)
  const savePreset = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const saved = await criteriaPresetService.savePreset(presetId, criteria);
      setCriteria(saved);
      setHasChanges(false);
      setToast({ type: "success", message: "Pré-set salvo com sucesso!" });
      return true;
    } catch {
      setToast({ type: "error", message: "Não foi possível salvar o pré-set. Tente novamente." });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [presetId, criteria]);

  const clearToast = useCallback(() => setToast(null), []);

  return {
    criteria,
    isLoading,
    isSaving,
    hasChanges,
    toast,
    clearToast,
    addCriterion,
    updateCriterion,
    removeCriterion,
    savePreset,
  };
}
