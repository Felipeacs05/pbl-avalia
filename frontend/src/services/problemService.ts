// src/services/problemService.ts
import type { ProblemDetails } from "../types/problem";
import { problemDetailsMock, createProblemInMock, updateProblemInMock, deleteProblemInMock } from "../mocks/problem.mock"; 
import type { Problem } from "../types/discipline"; 

const BASE_URL = "/api/v1/problems";
const IS_TEST = process.env.NODE_ENV === "test";

export const problemService = {
  async fetchProblemDetails(problemId: string): Promise<ProblemDetails | null> {
    if (!IS_TEST) {
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

  
  // Cria um problema na disciplina e devolve o problema criado (com o id gerado)
  async createProblem(
    disciplineId: string,
    input: { title: string; description: string }
  ): Promise<Problem> {
    if (!IS_TEST) {
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
    const response = await fetch(`/api/v1/disciplines/${disciplineId}/problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Falha ao criar o problema.");
    return response.json();
  },

  // Edita título e descrição do problema (o pré-set de critérios é editado na tela própria)
  async updateProblem(problemId: string, input: { title: string; description: string }): Promise<void> {
    if (!IS_TEST) {
      return new Promise((resolve) =>
        setTimeout(() => {
          updateProblemInMock(problemId, input);
          resolve();
        }, 400)
      );
    }
    const response = await fetch(`${BASE_URL}/${problemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Falha ao editar o problema.");
  },

  async deleteProblem(problemId: string): Promise<void> {
    if (!IS_TEST) {
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
    if (!IS_TEST) {
      return new Promise((resolve) =>
        setTimeout(() => {
          const sessionId = `session_${Date.now()}`;
          resolve({ sessionId });
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
    if (!IS_TEST) {
      return new Promise((resolve) => setTimeout(() => resolve(), 500));
    }
    await fetch(`${BASE_URL}/${problemId}/self-evaluation/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  },
};
