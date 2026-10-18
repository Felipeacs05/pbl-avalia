// src/mocks/studentEvaluation.mock.ts
import type { StudentEvaluationData } from "../types/performanceTable";

const DEFAULT_SAMPLE_TAGS = [
  "Boas considerações",
  "Atraso",
  "Uso de celular fora de hora",
];

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
      return { ...stored };
    }

    const initialTags =
      existingTags.length > 0 ? existingTags : DEFAULT_SAMPLE_TAGS;

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
