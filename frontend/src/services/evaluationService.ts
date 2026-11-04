// src/services/evaluationService.ts
import type { EvaluationStatus, EvaluationType } from "../types/evaluation";
import { evaluationMock } from "../mocks/evaluationMock";
import { USE_REAL_API } from "./apiMode";
import { getAuthHeaders, mapEvaluationStatusFromApi } from "./mappers";

const BASE_URL = "/api/v1/problems";

const STATUS_ERROR_MESSAGE = "Não foi possível carregar o status da avaliação.";
const RELEASE_ERROR_MESSAGE = "Não foi possível alterar a liberação da avaliação.";
const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Tente novamente.";

// Falhas no contrato { status, message }; status 0 = sem resposta (rede)
async function toApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return { status: response.status, message: body?.message || fallback };
}

function withAuthInit(init: RequestInit): RequestInit {
  const authHeaders = getAuthHeaders();
  if (Object.keys(authHeaders).length === 0) {
    return init;
  }
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...authHeaders,
    },
  };
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
      response = await fetch(
        `${BASE_URL}/${problemId}/evaluation-status`,
        withAuthInit({ method: "GET" })
      );
    } catch {
      throw { status: 0, message: NETWORK_ERROR_MESSAGE };
    }
    // Não inventa um status: o aluno veria uma liberação que não existe
    if (!response.ok) throw await toApiError(response, STATUS_ERROR_MESSAGE);
    const raw = (await response.json()) as Record<string, unknown>;
    if ("isReleased" in raw) {
      return raw as unknown as EvaluationStatus;
    }
    return mapEvaluationStatusFromApi(problemId, raw);
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
      response = await fetch(
        `${BASE_URL}/${problemId}/evaluations/release`,
        withAuthInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(keepOthers ? { type, keepOthers } : { type }),
        })
      );
    } catch {
      throw { status: 0, message: NETWORK_ERROR_MESSAGE };
    }
    // Sem fallback para o mock: o tutor precisa saber que a liberação não foi gravada
    if (!response.ok) throw await toApiError(response, RELEASE_ERROR_MESSAGE);
    const raw = (await response.json()) as Record<string, unknown>;
    if ("isReleased" in raw) {
      return raw as unknown as EvaluationStatus;
    }
    return mapEvaluationStatusFromApi(problemId, raw);
  },

  async toggleSelfAssessmentRelease(problemId: string): Promise<void> {
    if (!USE_REAL_API) return;
    await fetch(
      `${BASE_URL}/${problemId}/self-assessment-release`,
      withAuthInit({ method: "PATCH" })
    );
  },

  async togglePeerAssessmentRelease(problemId: string): Promise<void> {
    if (!USE_REAL_API) return;
    await fetch(
      `${BASE_URL}/${problemId}/peer-assessment-release`,
      withAuthInit({ method: "PATCH" })
    );
  },
};
