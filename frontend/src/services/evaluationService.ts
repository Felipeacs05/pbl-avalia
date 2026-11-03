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
    type: EvaluationType,
    // keepOthers: libera este tipo sem desligar o que já está liberado (usado ao liberar os dois juntos)
    options: { keepOthers?: boolean } = {}
  ): Promise<EvaluationStatus> {
    const keepOthers = options.keepOthers === true;
    if (!USE_REAL_API) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const updated = evaluationMock.saveStatus(problemId, type, keepOthers);
          resolve(updated);
        }, 450);
      });
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${problemId}/evaluations/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ATENÇÃO (combinar com o back-end): ao liberar a autoavaliação e a avaliação entre pares juntas,
        // o 1º POST vai como { type } e o 2º como { type, keepOthers: true }.
        // O back-end precisa entender keepOthers como "libere este tipo SEM desligar o que já está liberado";
        // sem esse campo, cada POST substitui a liberação anterior e só o último tipo fica salvo.
        body: JSON.stringify(keepOthers ? { type, keepOthers } : { type }),
      });
    } catch {
      throw { status: 0, message: NETWORK_ERROR_MESSAGE };
    }
    // Sem fallback para o mock: o tutor precisa saber que a liberação não foi gravada
    if (!response.ok) throw await toApiError(response, RELEASE_ERROR_MESSAGE);
    return await response.json();
  },
};
