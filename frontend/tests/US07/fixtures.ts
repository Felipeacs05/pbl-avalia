// frontend/tests/US07/fixtures.ts
// Dados fixos para os testes da US07 — Pré-set de Critérios.

import type { PresetCriterion } from "@/types/performanceTable";
import type { CriterionInput } from "@/hooks/useCriteriaPreset";

// ---------------------------------------------------------------------------
// IDs fixos
// ---------------------------------------------------------------------------
export const PRESET_ID          = "preset-uuid-01";
export const OTHER_PRESET_ID    = "preset-uuid-02";
export const PRESET_PROBLEM_ID  = "problem-uuid-01";
export const ROOM_ID            = "room-uuid-01";

// IDs dos critérios do INITIAL_PRESET do mock
export const PAPEL_ID               = "crit_papel";
export const PARTICIPACAO_ID        = "crit_participacao";
export const SEGMENTOS_ID           = "crit_segmentos";
export const COMPORTAMENTO_ID       = "crit_comportamento";
export const AUTOAVALIACAO_ID       = "crit_autoavaliacao";
export const PARES_ID               = "crit_pares";

// Compatibilidade com aliases
export const CRIT_PAPEL_ID          = PAPEL_ID;
export const CRIT_PARTICIPACAO_ID   = PARTICIPACAO_ID;
export const CRIT_SEGMENTOS_ID      = SEGMENTOS_ID;
export const CRIT_COMPORTAMENTO_ID  = COMPORTAMENTO_ID;
export const CRIT_AUTOAVALIACAO_ID  = AUTOAVALIACAO_ID;
export const CRIT_PARES_ID          = PARES_ID;

let presetCounter = 0;
export const uniquePresetId = () => `preset-test-${Date.now()}-${++presetCounter}`;

// ---------------------------------------------------------------------------
// Preset inicial — espelho do criteriaPreset.mock.ts > INITIAL_PRESET
// Qualquer alteração no mock deve ser refletida aqui.
// ---------------------------------------------------------------------------
export const INITIAL_CRITERIA: PresetCriterion[] = [
  { id: PAPEL_ID,         name: "Papel",              weight: 25, isRemovable: false },
  { id: PARTICIPACAO_ID,  name: "Participação",       weight: 25, isRemovable: true  },
  { id: SEGMENTOS_ID,     name: "Segmentos",          weight: 25, isRemovable: true  },
  { id: COMPORTAMENTO_ID, name: "Comportamento",      weight: 25, isRemovable: true  },
  { id: AUTOAVALIACAO_ID, name: "Auto Avaliação",     weight: 0,  isRemovable: false, isToggle: true, enabled: true },
  { id: PARES_ID,         name: "Avaliação em pares", weight: 0,  isRemovable: false, isToggle: true, enabled: true },
];

/** Total de critérios no preset inicial (usado em asserções de contagem). */
export const INITIAL_CRITERIA_COUNT = INITIAL_CRITERIA.length; // 6

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/** Cria um PresetCriterion opcional e removível. Padrão: Participação 25% */
export function makePresetCriterion(overrides: Partial<PresetCriterion> = {}): PresetCriterion {
  return {
    id: "crit_test_01",
    name: "Participação",
    weight: 25,
    isRemovable: true,
    ...overrides,
  };
}

/** Cria um PresetCriterion fixo (Papel). */
export function makeFixedCriterion(overrides: Partial<PresetCriterion> = {}): PresetCriterion {
  return {
    id: PAPEL_ID,
    name: "Papel",
    weight: 25,
    isRemovable: false,
    ...overrides,
  };
}

/** Retorna o preset inicial como cópia mutável. */
export function makePreset(): PresetCriterion[] {
  return INITIAL_CRITERIA.map((c) => ({ ...c }));
}

/** Alias compatível */
export const makeInitialPreset = makePreset;

/** Cria um CriterionInput (campos que o professor preenche no modal). */
export function makeCriterionInput(overrides: Partial<CriterionInput> = {}): CriterionInput {
  return { name: "Pesquisa", weight: 25, ...overrides };
}

// ---------------------------------------------------------------------------
// Mensagens e Validações
// ---------------------------------------------------------------------------

// Mensagem de soma inválida do mock/backend
export const invalidSumText = (total: number) =>
  `A soma dos pesos deve ser 100% (atual: ${total}%).`;

// Validação de nome
export const CRITERIA_REQUIRED_MESSAGE            = "O nome do critério é obrigatório.";
export const EMPTY_NAME_ERROR                    = CRITERIA_REQUIRED_MESSAGE;
export const EMPTY_NAME_ERROR_RE                 = /o nome do critério é obrigatório/i;

export const CRITERIA_INVALID_CHARACTERS_MESSAGE =
  "O nome do critério contém caracteres inválidos. Utilize apenas letras, números e hifens.";

export const DUPLICATE_NAME_MESSAGE              = "Já existe um critério com esse nome.";
export const DUPLICATE_NAME_ERROR                = DUPLICATE_NAME_MESSAGE;
export const DUPLICATE_NAME_ERROR_RE             = /já existe um critério com esse nome/i;

// Validação de peso
export const WEIGHT_MIN                          = 0;
export const WEIGHT_MAX                          = 100;
export const WEIGHT_INVALID_MESSAGE              = `O peso deve ser um número inteiro de ${WEIGHT_MIN} a ${WEIGHT_MAX}.`;
export const WEIGHT_ERROR_TEXT                   = WEIGHT_INVALID_MESSAGE;
export const WEIGHT_ERROR_RE                     = /o peso deve ser um número inteiro de/i;

// Toasts e avisos
export const SAVED_MESSAGE                       = "Pré-set salvo com sucesso!";
export const SAVE_SUCCESS_TEXT                   = SAVED_MESSAGE;
export const SAVE_SUCCESS_RE                     = /pré-set salvo com sucesso/i;

export const SAVE_GENERIC_ERROR_MESSAGE          = "Não foi possível salvar o pré-set. Tente novamente.";
export const SAVE_ERROR_TEXT                     = SAVE_GENERIC_ERROR_MESSAGE;
export const SAVE_ERROR_RE                       = /não foi possível salvar o pré-set/i;

export const LOAD_ERROR_MESSAGE                  = "Não foi possível carregar os critérios.";
export const LOAD_ERROR_TEXT                     = LOAD_ERROR_MESSAGE;
export const LOAD_ERROR_RE                       = /não foi possível carregar os critérios/i;

export const UNSAVED_CHANGES_MESSAGE             = "Há alterações não salvas.";
export const NO_CRITERIA_MESSAGE                 = "Adicione pelo menos um critério antes de salvar o pré-set.";

// Botões / rótulos
export const ADD_BTN_LABEL                       = "Adicionar Critério";
export const SAVE_BTN_LABEL                      = "Salvar Pre-set";
export const SAVING_BTN_TEXT                     = "Salvando...";
export const CANCEL_BTN_LABEL                    = "Cancelar";
export const CONFIRM_ADD_BTN                     = "Adicionar";
export const CONFIRM_SAVE_BTN                    = "Salvar";

// Limites de tamanho de nome
export const NAME_MAX_PLAN                       = 255;
export const NAME_MAX_UI                         = 255;
export const MAX_NAME_LENGTH_PLAN                = NAME_MAX_PLAN;
export const MAX_NAME_LENGTH_IMPL                = NAME_MAX_UI;

// Delays e Rotas
export const PRESET_DELAY_MS                     = 400;
export const CRITERIA_ROUTE                      = /\/api\/v1\/criteria/;
export const PERFORMANCE_TABLES_ROUTE            = /\/api\/v1\/performance-tables/;

// Casos de teste de segurança e injeção
export const XSS_NAME                            = "<script>alert(1)</script>";
export const CONTROL_CHAR_NAME                   = "Nome\u0000Proibido";
export const VALID_NAMES                         = [
  "Participação",
  "Critério 1",
  "Auto-Avaliação",
  "Segmentos",
  "Comportamento",
];
export const INJECTION_NAMES                     = [
  "<script>alert(1)</script>",
  "DROP TABLE users;",
  "Nome\u0000Invalido",
  "Test@Criteria",
  "<b>Negrito</b>",
];
