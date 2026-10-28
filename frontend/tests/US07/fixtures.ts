// frontend/tests/US07/fixtures.ts
// Dados fixos para os testes da US07 — Pré-set de Critérios.

import type { PresetCriterion } from "@/types/performanceTable";
import type { CriterionInput } from "@/hooks/useCriteriaPreset";

// ---------------------------------------------------------------------------
// IDs fixos
// ---------------------------------------------------------------------------
export const PRESET_ID       = "preset-uuid-01";
export const OTHER_PRESET_ID = "preset-uuid-02";

// IDs dos critérios do INITIAL_PRESET do mock
export const CRIT_PAPEL_ID          = "crit_papel";
export const CRIT_PARTICIPACAO_ID   = "crit_participacao";
export const CRIT_SEGMENTOS_ID      = "crit_segmentos";
export const CRIT_COMPORTAMENTO_ID  = "crit_comportamento";
export const CRIT_AUTOAVALIACAO_ID  = "crit_autoavaliacao";
export const CRIT_PARES_ID          = "crit_pares";

// ---------------------------------------------------------------------------
// Preset inicial — espelho do criteriaPreset.mock.ts > INITIAL_PRESET
// Qualquer alteração no mock deve ser refletida aqui.
// ---------------------------------------------------------------------------
export const INITIAL_CRITERIA: PresetCriterion[] = [
  { id: CRIT_PAPEL_ID,         name: "Papel",              weight: 1, isOptional: false, isRemovable: false },
  { id: CRIT_PARTICIPACAO_ID,  name: "Participação",       weight: 1, isOptional: false, isRemovable: true  },
  { id: CRIT_SEGMENTOS_ID,     name: "Segmentos",          weight: 1, isOptional: false, isRemovable: true  },
  { id: CRIT_COMPORTAMENTO_ID, name: "Comportamento",      weight: 1, isOptional: false, isRemovable: true  },
  { id: CRIT_AUTOAVALIACAO_ID, name: "Auto Avaliação",     weight: 1, isOptional: true,  isRemovable: true  },
  { id: CRIT_PARES_ID,         name: "Avaliação em pares", weight: 1, isOptional: true,  isRemovable: true  },
];

/** Total de critérios no preset inicial (usado em asserções de contagem). */
export const INITIAL_CRITERIA_COUNT = INITIAL_CRITERIA.length; // 6

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/** Cria um PresetCriterion opcional e removível (critério adicionado pelo professor). */
export function makePresetCriterion(overrides: Partial<PresetCriterion> = {}): PresetCriterion {
  return {
    id: "crit_test_01",
    name: "Pesquisa",
    weight: 3,
    isOptional: true,
    isRemovable: true,
    ...overrides,
  };
}

/** Retorna o preset inicial como cópia mutável — não polui a constante exportada. */
export function makeInitialPreset(): PresetCriterion[] {
  return INITIAL_CRITERIA.map((c) => ({ ...c }));
}

/** Cria um CriterionInput (campos que o professor preenche no modal). */
export function makeCriterionInput(overrides: Partial<CriterionInput> = {}): CriterionInput {
  return { name: "Pesquisa", weight: 3, ...overrides };
}

// ---------------------------------------------------------------------------
// Mensagens (evita strings avulsas duplicadas nos testes)
// ---------------------------------------------------------------------------

// Validação de nome
export const EMPTY_NAME_ERROR        = "O nome do critério não pode ficar vazio.";
export const EMPTY_NAME_ERROR_RE     = /o nome do critério não pode ficar vazio/i;
export const DUPLICATE_NAME_ERROR    = "Já existe um critério com esse nome.";
export const DUPLICATE_NAME_ERROR_RE = /já existe um critério com esse nome/i;

// Validação de peso
export const WEIGHT_ERROR_TEXT = "O peso deve ser um número inteiro de 1 a 10.";
export const WEIGHT_ERROR_RE   = /o peso deve ser um número inteiro de 1 a 10/i;

// Toasts
export const SAVE_SUCCESS_TEXT = "Pré-set salvo com sucesso!";
export const SAVE_SUCCESS_RE   = /pré-set salvo com sucesso/i;
export const SAVE_ERROR_TEXT   = "Não foi possível salvar o pré-set. Tente novamente.";
export const SAVE_ERROR_RE     = /não foi possível salvar o pré-set/i;
export const LOAD_ERROR_TEXT   = "Não foi possível carregar os critérios.";
export const LOAD_ERROR_RE     = /não foi possível carregar os critérios/i;

// Botões / rótulos
export const ADD_BTN_LABEL    = "Adicionar Critério";
export const SAVE_BTN_LABEL   = "Salvar Pre-set";
export const SAVING_BTN_TEXT  = "Salvando...";
export const CANCEL_BTN_LABEL = "Cancelar";
export const CONFIRM_ADD_BTN  = "Adicionar";
export const CONFIRM_SAVE_BTN = "Salvar"; // submit em modo edição

// Divergências do plano de testes documentadas (usadas nos cenários [QA])
export const XSS_NAME            = "<script>alert(1)</script>";
export const CONTROL_CHAR_NAME   = "Nome\u0000Proibido"; // caractere nulo — CT-FE-04

// CT-BND-01: limite especificado no plano vs. implementação real
export const MAX_NAME_LENGTH_PLAN = 255; // exigência do plano
export const MAX_NAME_LENGTH_IMPL = 60;  // maxLength real do input
