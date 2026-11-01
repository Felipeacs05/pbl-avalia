// src/services/evaluationService.ts
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { evaluationMock } from "../mocks/evaluationMock";
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/problems";

const STATUS_ERROR_MESSAGE = "Não foi possível carregar o status da avaliação.";
const RELEASE_ERROR_MESSAGE = "Não foi possível alterar a liberação da avaliação.";
const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Tente novamente.";

// Falhas no contrato { status, message }; status 0 = sem resposta (rede)
async function toApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return { status: response.status, message: body?.message || fallback };
}

export const evaluationService = {
  /**
   * Fetches the current evaluation status for a specific problem.
   */
  async getEvaluationStatus(problemId: string): Promise<EvaluationStatus> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const status = evaluationMock.getStatus(problemId);
          resolve(status);
        }, 350);
      });
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${problemId}/evaluation-status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      throw { status: 0, message: NETWORK_ERROR_MESSAGE };
    }
    // Não inventa um status: o aluno veria uma liberação que não existe
    if (!response.ok) throw await toApiError(response, STATUS_ERROR_MESSAGE);
    return await response.json();
  },

  /**
   * Releases or updates the evaluation type for a specific problem.
   * If type is null, it revokes/un-releases the active evaluation.
   */
  async releaseEvaluation(
    problemId: string,
    type: EvaluationType
  ): Promise<EvaluationStatus> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const updated = evaluationMock.saveStatus(problemId, type);
          resolve(updated);
        }, 450);
      });
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${problemId}/evaluations/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
    } catch {
      throw { status: 0, message: NETWORK_ERROR_MESSAGE };
    }
    // Sem fallback para o mock: o tutor precisa saber que a liberação não foi gravada
    if (!response.ok) throw await toApiError(response, RELEASE_ERROR_MESSAGE);
    return await response.json();
  },
};
