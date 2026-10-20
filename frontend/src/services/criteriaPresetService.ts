// src/services/criteriaPresetService.ts

// Acesso ao Pré-set de Critérios. Hoje responde pelo mock; quando o endpoint existir,
// só este arquivo muda (o hook e a tela continuam iguais).
import type { PresetCriterion } from "../types/performanceTable";
import { criteriaPresetMock } from "../mocks/criteriaPreset.mock";

// Tempo de resposta simulado, para dar para ver o carregamento e o "Salvando..."
const FAKE_DELAY_MS = 400;

function wait<T>(value: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value()), FAKE_DELAY_MS));
}

export const criteriaPresetService = {
  // presetId: id do problema (ou da sala, na tela isolada)
  // TODO: GET /api/v1/problems/{problemId}/criteria-preset
  async fetchPreset(presetId: string): Promise<PresetCriterion[]> {
    return wait(() => criteriaPresetMock.getPreset(presetId));
  },

  // TODO: PUT /api/v1/problems/{problemId}/criteria-preset
  async savePreset(presetId: string, criteria: PresetCriterion[]): Promise<PresetCriterion[]> {
    return wait(() => criteriaPresetMock.savePreset(presetId, criteria));
  },
};
