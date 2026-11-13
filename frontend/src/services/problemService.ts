// src/services/problemService.ts
import type { ProblemDetails } from "../types/problem";
import { problemDetailsMock, createProblemInMock, createSessionInMock, updateProblemInMock, deleteProblemInMock } from "../mocks/problem.mock"; 
import type { Problem } from "../types/discipline"; 
import { USE_REAL_API } from "./apiMode";
import { authFetch } from "./authFetch";

const BASE_URL = "/api/v1/problems";

export const problemService = {
  async fetchProblems(roomId: string): Promise<Problem[]> {
    if (!USE_REAL_API) {
      return [];
    }
    const response = await authFetch(`/api/v1/rooms/${roomId}/problems`);
    if (!response.ok) return [];
    return response.json();
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
    const response = await authFetch(`${BASE_URL}/${problemId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    return response.json();
  },

  // Cria um problema na disciplina e devolve o problema criado (com o id gerado)
  async createProblem(
    disciplineId: string,
    input: { title: string; description: string }
  ): Promise<Problem> {
    if (!USE_REAL_API) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            resolve(createProblemInMock(disciplineId, input));
          } catch (error) {
            reject(error);
          }
        }, 500)
      );
    }
    const response = await authFetch(`/api/v1/disciplines/${disciplineId}/problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      if (response.status === 403) {
        throw { status: 403, message: "Apenas o tutor responsável pela sala pode gerenciar problemas." };
      }
      throw new Error("Falha ao criar o problema.");
    }
    return response.json();
  },

  // Edita título e descrição do problema (o pré-set de critérios é editado na tela própria)
  async updateProblem(problemId: string, input: { title: string; description: string }): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) =>
        setTimeout(() => {
          updateProblemInMock(problemId, input);
          resolve();
        }, 400)
      );
    }
    const response = await authFetch(`${BASE_URL}/${problemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      if (response.status === 403) {
        throw { status: 403, message: "Apenas o tutor responsável pela sala pode gerenciar problemas." };
      }
      throw new Error("Falha ao editar o problema.");
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
    const response = await authFetch(`${BASE_URL}/${problemId}`, { method: "DELETE" });
    if (!response.ok) {
      if (response.status === 403) {
        throw { status: 403, message: "Apenas o tutor responsável pela sala pode gerenciar problemas." };
      }
      throw new Error("Falha ao excluir o problema.");
    }
  },

  async startSession(problemId: string): Promise<{ sessionId: string }> {
    if (!USE_REAL_API) {
      // Cria a sessão dentro do problema e a mantém ativa (em andamento) na lista
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
    const response = await authFetch(`${BASE_URL}/${problemId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  async releaseSelfEvaluation(problemId: string): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    await authFetch(`${BASE_URL}/${problemId}/self-evaluation/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },
};
