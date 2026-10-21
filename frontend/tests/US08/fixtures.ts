import type { Criterion, PerformanceTable } from "@/types/performanceTable";

// Mesmos UUIDs dos testes de backend da US08
export const ROOM_ID = "550e8400-e29b-41d4-a716-446655440000";
export const PERFORMANCE_TABLE_ID = "771a3400-e29b-41d4-b825-112233445566";
export const CONTENT_ID = "881a3400-e29b-41d4-b825-112233445561";
export const PARTICIPATION_ID = "881a3400-e29b-41d4-b825-112233445562";
export const SELF_ASSESSMENT_ID = "881a3400-e29b-41d4-b825-112233445563";

// Mensagem devolvida pelo backend no 422
export const INVALID_SUM_MESSAGE_TEXT = "A soma dos pesos deve ser exatamente 100% (1.0).";
export const INVALID_SUM_MESSAGE = /soma dos pesos deve ser exatamente 100%/i;

export function makeCriterion(overrides: Partial<Criterion> = {}): Criterion {
  return {
    criterionId: CONTENT_ID,
    criteriaName: "Conteúdo",
    criteriaDescription: "Domínio do conteúdo do problema",
    criteriaWeight: 0.4,
    status: "ACTIVE",
    ...overrides,
  };
}

// Pesos em decimal (0–1), como o backend os guarda
export const makeCriteria = (content = 0.4, participation = 0.3, selfAssessment = 0.3): Criterion[] => [
  makeCriterion({ criterionId: CONTENT_ID, criteriaName: "Conteúdo", criteriaWeight: content }),
  makeCriterion({
    criterionId: PARTICIPATION_ID,
    criteriaName: "Participação",
    criteriaDescription: "Participação nas sessões tutoriais",
    criteriaWeight: participation,
  }),
  makeCriterion({
    criterionId: SELF_ASSESSMENT_ID,
    criteriaName: "Autoavaliação",
    criteriaDescription: "Autoavaliação do aluno",
    criteriaWeight: selfAssessment,
  }),
];

export function makePerformanceTable(overrides: Partial<PerformanceTable> = {}): PerformanceTable {
  return {
    performanceTableId: PERFORMANCE_TABLE_ID,
    roomId: ROOM_ID,
    tableName: "Tabela de Desempenho",
    status: "ACTIVE",
    criteriaList: makeCriteria(),
    ...overrides,
  };
}
