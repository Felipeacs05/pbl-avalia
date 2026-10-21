// src/mocks/criteriaPreset.mock.ts
// Simula o back-end do Pré-set de Critérios (US07) enquanto o endpoint não existe.
// Os critérios iniciais são os do Figma.
import type { PresetCriterion } from "../types/performanceTable";

const INITIAL_PRESET: PresetCriterion[] = [
  { id: "crit_papel", name: "Papel", weight: 1, isOptional: false, isRemovable: false },
  { id: "crit_participacao", name: "Participação", weight: 1, isOptional: false, isRemovable: true },
  { id: "crit_segmentos", name: "Segmentos", weight: 1, isOptional: false, isRemovable: true },
  { id: "crit_comportamento", name: "Comportamento", weight: 1, isOptional: false, isRemovable: true },
  { id: "crit_autoavaliacao", name: "Auto Avaliação", weight: 1, isOptional: true, isRemovable: true },
  { id: "crit_pares", name: "Avaliação em pares", weight: 1, isOptional: true, isRemovable: true },
];

// Pré-set salvo por dono (problema ou sala), em memória.
// Todo problema novo "nasce" com o INITIAL_PRESET até o professor salvar o dele.
const presetsById = new Map<string, PresetCriterion[]>();

export const criteriaPresetMock = {
  getPreset(presetId: string): PresetCriterion[] {
    const saved = presetsById.get(presetId) ?? INITIAL_PRESET;
    return saved.map((c) => ({ ...c })); // cópia, para a tela não alterar o "banco" sem salvar
  },

  savePreset(presetId: string, criteria: PresetCriterion[]): PresetCriterion[] {
    presetsById.set(presetId, criteria.map((c) => ({ ...c })));
    return criteriaPresetMock.getPreset(presetId);
  },
};
