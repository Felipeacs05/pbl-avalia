// src/services/problemService.ts
import type { ProblemDetails } from "../types/problem";
import { problemDetailsMock, createProblemInMock, createSessionInMock, updateProblemInMock, deleteProblemInMock } from "../mocks/problem.mock"; 
import type { Problem } from "../types/discipline"; 
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/problems";

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
    const response = await fetch(`/api/v1/rooms/${roomId}/problems`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Falha ao carregar problemas da sala.");
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
    const response = await fetch(`${BASE_URL}/${problemId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    return response.json();
  },

  // Cria um problema na sala e devolve o problema criado
  async createProblem(
    roomIdOrDisciplineId: string,
    input: string | { title: string; description?: string }
  ): Promise<Problem> {
    const title = typeof input === "string" ? input : input.title;
    const description = typeof input === "object" && input.description ? input.description : "";

    if (!USE_REAL_API) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            resolve(createProblemInMock(roomIdOrDisciplineId, { title, description }));
          } catch {
            const fallback: Problem = { id: `prob_${Date.now()}`, title, description };
            resolve(fallback);
          }
        }, 500)
      );
    }
    const response = await fetch(`/api/v1/rooms/${roomIdOrDisciplineId}/problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("Falha ao criar o problema.");
    return response.json();
  },

  // Edita título do problema no backend
  async updateProblem(
    problemId: string,
    input: string | { title: string; description?: string }
  ): Promise<Problem> {
    const title = typeof input === "string" ? input : input.title;
    const description = typeof input === "object" && input.description ? input.description : "";

    if (!USE_REAL_API) {
      return new Promise((resolve) =>
        setTimeout(() => {
          updateProblemInMock(problemId, { title, description });
          resolve({ id: problemId, title, description });
        }, 400)
      );
    }
    const response = await fetch(`${BASE_URL}/${problemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const error = new Error("Falha ao editar o problema.") as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return response.json();
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
    const response = await fetch(`${BASE_URL}/${problemId}`, { method: "DELETE" });
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
    const response = await fetch(`${BASE_URL}/${problemId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  async releaseSelfEvaluation(problemId: string): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    await fetch(`${BASE_URL}/${problemId}/self-assessment-release`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
  },

  async releasePeerEvaluation(problemId: string): Promise<void> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    await fetch(`${BASE_URL}/${problemId}/peer-assessment-release`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
  },
};
