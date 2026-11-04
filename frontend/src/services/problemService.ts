// src/services/problemService.ts
import type { ProblemDetails } from "../types/problem";
import {
  problemDetailsMock,
  createProblemInMock,
  createSessionInMock,
  updateProblemInMock,
  deleteProblemInMock,
} from "../mocks/problem.mock";
import type { Problem } from "../types/discipline";
import { USE_REAL_API } from "./apiMode";
import {
  getAuthHeaders,
  mapProblemDetailsFromApi,
  mapProblemFromApi,
} from "./mappers";

const BASE_URL = "/api/v1/problems";
const FORBIDDEN_PROBLEM_MSG =
  "Apenas o tutor responsável pela sala pode gerenciar problemas.";

function withAuthInit(init: RequestInit): RequestInit {
  const authHeaders = getAuthHeaders({});
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

export const problemService = {
  async fetchProblems(roomId: string): Promise<Problem[]> {
    if (!USE_REAL_API) {
      const details = Object.values(problemDetailsMock).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
      }));
      return new Promise((resolve) => setTimeout(() => resolve(details), 300));
    }
    const response = await fetch(
      `/api/v1/rooms/${roomId}/problems`,
      withAuthInit({
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
    );
    if (!response.ok) throw new Error("Falha ao carregar problemas da sala.");
    const data = (await response.json()) as Record<string, unknown>[];
    return Array.isArray(data) ? data.map((item) => mapProblemFromApi(item)) : [];
  },

  async fetchProblemDetails(problemId: string): Promise<ProblemDetails | null> {
    if (!USE_REAL_API) {
      return new Promise((resolve) =>
        setTimeout(() => {
          const found = problemDetailsMock[problemId] ?? null;
          resolve(found);
        }, 400)
      );
    }
    const response = await fetch(
      `${BASE_URL}/${problemId}`,
      withAuthInit({ method: "GET" })
    );
    if (!response.ok) return null;
    const rawProblem = (await response.json()) as Record<string, unknown>;

    if ("sessions" in rawProblem && Array.isArray(rawProblem.sessions)) {
      return rawProblem as unknown as ProblemDetails;
    }

    let sessionsRaw: unknown[] | undefined;
    try {
      const sessionsRes = await fetch(
        `${BASE_URL}/${problemId}/sessions`,
        withAuthInit({ method: "GET" })
      );
      if (sessionsRes.ok) {
        const parsed = await sessionsRes.json();
        if (Array.isArray(parsed)) {
          sessionsRaw = parsed;
        }
      }
    } catch {
      // Mantém sessions do próprio payload se houver
    }

    return mapProblemDetailsFromApi(rawProblem, sessionsRaw);
  },

  async createProblem(
    roomIdOrDisciplineId: string,
    input: string | { title: string; description?: string }
  ): Promise<Problem> {
    const title = typeof input === "string" ? input : input.title;
    const description =
      typeof input === "object" && input.description !== undefined
        ? input.description
        : "";

    if (!USE_REAL_API) {
      return new Promise((resolve) =>
        setTimeout(() => {
          try {
            resolve(
              createProblemInMock(roomIdOrDisciplineId, { title, description })
            );
          } catch {
            const fallback: Problem = {
              id: `prob_${Date.now()}`,
              title,
              description,
            };
            resolve(fallback);
          }
        }, 500)
      );
    }

    // Tela de disciplinas envia { title, description } na rota da disciplina;
    // a tela de problemas da sala envia só o título na rota da sala. O backend aceita as duas.
    const payload = typeof input === "object" ? { title, description } : { title };
    const route =
      typeof input === "object"
        ? `/api/v1/disciplines/${roomIdOrDisciplineId}/problems`
        : `/api/v1/rooms/${roomIdOrDisciplineId}/problems`;

    const response = await fetch(
      route,
      withAuthInit({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    if (response.status === 403) {
      throw { status: 403, message: FORBIDDEN_PROBLEM_MSG };
    }
    if (!response.ok) throw new Error("Falha ao criar o problema.");
    const raw = (await response.json()) as Record<string, unknown>;
    return mapProblemFromApi(raw);
  },

  async updateProblem(
    problemId: string,
    input: string | { title: string; description?: string }
  ): Promise<void> {
    const title = typeof input === "string" ? input : input.title;
    const description =
      typeof input === "object" && input.description !== undefined
        ? input.description
        : "";

    if (!USE_REAL_API) {
      return new Promise((resolve) =>
        setTimeout(() => {
          updateProblemInMock(problemId, { title, description });
          resolve();
        }, 400)
      );
    }

    const payload = typeof input === "object" ? { title, description } : { title };

    const response = await fetch(
      `${BASE_URL}/${problemId}`,
      withAuthInit({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    if (response.status === 403) {
      throw { status: 403, message: FORBIDDEN_PROBLEM_MSG };
    }
    if (!response.ok) {
      const error = new Error("Falha ao editar o problema.") as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }
  },

  async deleteProblem(problemId: string): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) =>
        setTimeout(() => {
          deleteProblemInMock(problemId);
          resolve();
        }, 400)
      );
    }
    const response = await fetch(
      `${BASE_URL}/${problemId}`,
      withAuthInit({ method: "DELETE" })
    );
    if (response.status === 403) {
      throw { status: 403, message: FORBIDDEN_PROBLEM_MSG };
    }
    if (!response.ok) throw new Error("Falha ao excluir o problema.");
  },

  async startSession(problemId: string): Promise<{ sessionId: string }> {
    if (!USE_REAL_API) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            resolve({ sessionId: createSessionInMock(problemId).id });
          } catch (error) {
            reject(error);
          }
        }, 600)
      );
    }
    const response = await fetch(
      `${BASE_URL}/${problemId}/sessions`,
      withAuthInit({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    if (!response.ok) {
      throw new Error("Falha ao iniciar sessão tutorial.");
    }
    const data = (await response.json()) as Record<string, unknown>;
    return {
      sessionId: String(data.sessionId ?? data.id ?? ""),
    };
  },

  async releaseSelfEvaluation(problemId: string): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    const response = await fetch(
      `${BASE_URL}/${problemId}/self-assessment-release`,
      withAuthInit({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
    );
    if (!response.ok) {
      throw new Error("Falha ao alterar liberação da autoavaliação.");
    }
  },

  async releasePeerEvaluation(problemId: string): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    const response = await fetch(
      `${BASE_URL}/${problemId}/peer-assessment-release`,
      withAuthInit({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      })
    );
    if (!response.ok) {
      throw new Error("Falha ao alterar liberação da avaliação entre pares.");
    }
  },
};
