// src/services/studentEvaluationService.ts
import type { StudentEvaluationData } from "../types/performanceTable";
import { studentEvaluationMock } from "../mocks/studentEvaluation.mock";
import { IS_TEST, USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/sessions";

function isFetchMocked(): boolean {
  return typeof fetch === "function" && "mock" in fetch;
}

export const studentEvaluationService = {
  async getStudentEvaluation(
    sessionId: string,
    studentId: string,
    studentName = "Aluno",
    tags: string[] = []
  ): Promise<StudentEvaluationData> {
    if (!USE_REAL_API || (IS_TEST && !isFetchMocked())) {
      return studentEvaluationMock.getEvaluation(
        sessionId,
        studentId,
        studentName,
        tags
      );
    }

    try {
      const response = await fetch(
        `${BASE_URL}/${sessionId}/evaluations/${studentId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        return studentEvaluationMock.getEvaluation(
          sessionId,
          studentId,
          studentName,
          tags
        );
      }
      return await response.json();
    } catch {
      return studentEvaluationMock.getEvaluation(
        sessionId,
        studentId,
        studentName,
        tags
      );
    }
  },

  async saveStudentEvaluation(
    data: StudentEvaluationData
  ): Promise<StudentEvaluationData> {
    if (!USE_REAL_API || (IS_TEST && !isFetchMocked())) {
      return studentEvaluationMock.saveEvaluation(data);
    }

    try {
      const response = await fetch(
        `${BASE_URL}/${data.sessionId}/evaluations/${data.studentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        return studentEvaluationMock.saveEvaluation(data);
      }
      return await response.json();
    } catch {
      return studentEvaluationMock.saveEvaluation(data);
    }
  },
};
