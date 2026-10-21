// src/mocks/criteriaPreset.mock.ts
// Simula o back-end do Pré-set de Critérios (US07) enquanto o endpoint não existe.
// Os critérios iniciais são os do Figma.
import type { PresetCriterion } from "../types/performanceTable";

const INITIAL_PRESET: PresetCriterion[] = [
  { id: "crit_papel", name: "Papel", weight: 20, isRemovable: false },
  { id: "crit_participacao", name: "Participação", weight: 20, isRemovable: true },
  { id: "crit_segmentos", name: "Segmentos", weight: 20, isRemovable: true },
  { id: "crit_comportamento", name: "Comportamento", weight: 20, isRemovable: true },
  { id: "crit_autoavaliacao", name: "Auto Avaliação", weight: 10, isRemovable: true },
  { id: "crit_pares", name: "Avaliação em pares", weight: 10, isRemovable: true },
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
    // Simula o 422 do back-end: a soma dos pesos precisa ser 100% (a tela não bloqueia, como na US08)
    const total = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (total !== 100) throw new Error(`A soma dos pesos deve ser 100% (atual: ${total}%).`);
    presetsById.set(presetId, criteria.map((c) => ({ ...c })));
    return criteriaPresetMock.getPreset(presetId);
  },
};
