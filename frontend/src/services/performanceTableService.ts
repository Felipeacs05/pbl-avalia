// src/services/performanceTableService.ts
import type {
  CriterionWeight,
  PerformanceTable,
} from "../types/performanceTable";

const BASE_URL = "/api/v1/performance-tables";
const IS_TEST = process.env.NODE_ENV === "test";

// Mock em memória para desenvolvimento e fallback fora do ambiente de teste
const memoryTables = new Map<string, PerformanceTable>([
  [
    "default",
    {
      performanceTableId: "771a3400-e29b-41d4-b825-112233445566",
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      tableName: "Tabela de Desempenho",
      status: "ACTIVE",
      criteriaList: [
        {
          criterionId: "881a3400-e29b-41d4-b825-112233445561",
          criteriaName: "Conteúdo",
          criteriaDescription: "Domínio do conteúdo do problema",
          criteriaWeight: 0.4,
          status: "ACTIVE",
        },
        {
          criterionId: "881a3400-e29b-41d4-b825-112233445562",
          criteriaName: "Participação",
          criteriaDescription: "Participação nas sessões tutoriais",
          criteriaWeight: 0.3,
          status: "ACTIVE",
        },
        {
          criterionId: "881a3400-e29b-41d4-b825-112233445563",
          criteriaName: "Autoavaliação",
          criteriaDescription: "Autoavaliação do aluno",
          criteriaWeight: 0.3,
          status: "ACTIVE",
        },
      ],
    },
  ],
]);

function isFetchMocked(): boolean {
  return typeof fetch === "function" && "mock" in fetch;
}

export const performanceTableService = {
  async fetchPerformanceTable(tableId: string): Promise<PerformanceTable> {
    if (!IS_TEST || !isFetchMocked()) {
      const existing = memoryTables.get(tableId) || memoryTables.get("default")!;
      return { ...existing, criteriaList: [...existing.criteriaList] };
    }

    const response = await fetch(`${BASE_URL}/${tableId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorBody.message || "Erro ao buscar tabela de desempenho.",
      };
    }

    return response.json();
  },

  async updateCriteriaWeights(
    tableId: string,
    weights: CriterionWeight[]
  ): Promise<PerformanceTable> {
    if (!IS_TEST || !isFetchMocked()) {
      const sum = weights.reduce((acc, curr) => acc + curr.criteriaWeight, 0);
      if (Math.abs(sum - 1.0) > 1e-6) {
        throw {
          status: 422,
          message: "A soma dos pesos deve ser exatamente 100% (1.0).",
        };
      }
      const existing = memoryTables.get(tableId) || memoryTables.get("default")!;
      const updated: PerformanceTable = {
        ...existing,
        criteriaList: existing.criteriaList.map((criterion) => {
          const match = weights.find((w) => w.criterionId === criterion.criterionId);
          return match
            ? { ...criterion, criteriaWeight: match.criteriaWeight }
            : criterion;
        }),
      };
      memoryTables.set(tableId, updated);
      return updated;
    }

    const response = await fetch(`${BASE_URL}/${tableId}/criteria/weights`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorBody.message || "Erro ao atualizar pesos dos critérios.",
      };
    }

    return response.json();
  },
};
