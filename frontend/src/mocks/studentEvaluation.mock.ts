// src/mocks/studentEvaluation.mock.ts
import type { StudentEvaluationData } from "../types/performanceTable";

const evaluationsStore = new Map<string, StudentEvaluationData>();

const keyOf = (sessionId: string, studentId: string) => `${sessionId}:${studentId}`;

export const studentEvaluationMock = {
  getEvaluation(
    sessionId: string,
    studentId: string,
    studentName = "Aluno",
    existingTags: string[] = []
  ): StudentEvaluationData {
    const key = keyOf(sessionId, studentId);
    const stored = evaluationsStore.get(key);
    if (stored) {
      // Nome e tags vêm da chamada da sessão (fonte da verdade), não do cache.
      // Antes o cache guardava o nome provisório e as tags de exemplo da 1ª busca, feita antes de a lista de alunos carregar.
      return { ...stored, studentName, tags: existingTags };
    }

    const initialTags = existingTags; // sem tags de exemplo

    const initialData: StudentEvaluationData = {
      sessionId,
      studentId,
      studentName,
      criteria: {
        comportamento: 100,
        participacao: 100,
        segmentos: 100,
        papelPassed: true,
        notaPapel: 100,
        notaAdicional: 0,
      },
      tags: initialTags,
      message: "",
      updatedAt: new Date().toISOString(),
    };

    evaluationsStore.set(key, initialData);
    return { ...initialData };
  },

  saveEvaluation(data: StudentEvaluationData): StudentEvaluationData {
    const key = keyOf(data.sessionId, data.studentId);
    const updated: StudentEvaluationData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    evaluationsStore.set(key, updated);
    return { ...updated };
  },

  reset(): void {
    evaluationsStore.clear();
  },
};
