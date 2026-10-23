// Fixtures e dados de teste para a User Story US07 (CRUD de Tabelas de Desempenho e Critérios)

export const ROOM_ID = "550e8400-e29b-41d4-a716-446655440000";
export const PERFORMANCE_TABLE_ID = "tbl-771a3400-e29b-41d4-b825-112233445566";
export const CRITERION_ID_1 = "crit-01-uuid";
export const CRITERION_ID_2 = "crit-02-uuid";

// Mensagens esperadas de validação no Frontend (em Português do Brasil)
export const CRITERIA_REQUIRED_MESSAGE = /o nome do critério é obrigatório/i;
export const CRITERIA_INVALID_CHARACTERS_MESSAGE = /caracteres inválidos/i;
export const CRITERIA_MIN_LENGTH_MESSAGE = /deve conter pelo menos 3 caracteres/i;

// Rotas de API mapeadas para interceptação de rede
export const PERFORMANCE_TABLES_ROUTE = /\/api\/v1\/performance-tables(\/[^/?#]+)?$/;
export const CRITERIA_ROUTE = /\/api\/v1\/performance-tables\/[^/?#]+\/criteria(\/[^/?#]+)?$/;

export interface CriterionFixture {
  criterionId?: string;
  criteriaName: string;
  criteriaDescription: string;
  criteriaWeight: number;
  status?: string;
}

export interface PerformanceTableFixture {
  performanceTableId: string;
  roomId: string;
  tableName: string;
  status: string;
  criteriaList: CriterionFixture[];
}

export const makeDefaultCriteriaList = (): CriterionFixture[] => [
  {
    criterionId: CRITERION_ID_1,
    criteriaName: "Postura e Ética Profissional",
    criteriaDescription: "Avaliação comportamental e respeito às normas da tutoria",
    criteriaWeight: 3.0,
    status: "ACTIVE",
  },
  {
    criterionId: CRITERION_ID_2,
    criteriaName: "Raciocínio Lógico",
    criteriaDescription: "Capacidade analítica e resolução de problemas complexos",
    criteriaWeight: 7.0,
    status: "ACTIVE",
  },
];

export function makePerformanceTable(
  overrides: Partial<PerformanceTableFixture> = {}
): PerformanceTableFixture {
  return {
    performanceTableId: PERFORMANCE_TABLE_ID,
    roomId: ROOM_ID,
    tableName: "Tabela de Avaliação Padrão - Módulo PBL",
    status: "ACTIVE",
    criteriaList: makeDefaultCriteriaList(),
    ...overrides,
  };
}
