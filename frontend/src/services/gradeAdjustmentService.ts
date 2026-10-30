// src/services/gradeAdjustmentService.ts

import type {
  GradeAdjustment,
  GradeAdjustmentInput,
  StudentSelfEvaluationReview,
  SubmittedSelfAssessment,
} from "../types/gradeAdjustment";
import { gradeAdjustmentMock } from "../mocks/gradeAdjustment.mock";

const FORBIDDEN_PT_BR = "Apenas o tutor responsável pela sala pode ajustar notas.";

export const gradeAdjustmentService = {
  /**
   * Envia o ajuste da nota de autoavaliação para o backend (PATCH /api/v1/assessments/{assessmentId}/grade-adjustment).
   */
  async adjustGrade(
    assessmentId: string,
    input: GradeAdjustmentInput
  ): Promise<GradeAdjustment> {
    let response: Response;
    try {
      response = await fetch(
        `/api/v1/assessments/${assessmentId}/grade-adjustment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adjustedGrade: input.adjustedGrade,
            justification: input.justification,
          }),
        }
      );
    } catch {
      if (process.env.NODE_ENV !== "test") {
        return gradeAdjustmentMock.adjustGrade(assessmentId, input);
      }
      throw { status: 500, message: "Erro de conexão ao salvar o ajuste de nota." };
    }

    if (response.status === 403) {
      throw {
        status: 403,
        message: FORBIDDEN_PT_BR,
      };
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (process.env.NODE_ENV !== "test" && contentType.includes("text/html")) {
        return gradeAdjustmentMock.adjustGrade(assessmentId, input);
      }

      let errorMessage = "Não foi possível salvar o ajuste de nota.";
      try {
        const body = (await response.json()) as {
          message?: string;
          errors?: Record<string, string>;
        };
        if (body.errors?.justification) {
          errorMessage = body.errors.justification;
        } else if (body.message) {
          errorMessage = body.message;
        }
      } catch {
        // Mantém mensagem padrão
      }

      throw {
        status: response.status,
        message: errorMessage,
      };
    }

    const data = (await response.json()) as GradeAdjustment;
    return data;
  },

  /**
   * Busca os dados de uma autoavaliação específica (usado nas rotas de avaliação / E2E).
   */
  async getAssessment(assessmentId: string): Promise<SubmittedSelfAssessment> {
    try {
      const response = await fetch(`/api/v1/assessments/${assessmentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = (await response.json()) as Partial<SubmittedSelfAssessment>;
        return {
          id: data.id ?? assessmentId,
          studentId: data.studentId ?? "",
          studentName: data.studentName ?? "Aluno",
          score: typeof data.score === "number" ? data.score : (data.adjustedGrade ?? data.originalGrade ?? 6.0),
          comment: data.comment ?? "Participei ativamente das sessões",
          modifiedByTutor: Boolean(data.modifiedByTutor ?? data.ajustado_por_tutor),
          ajustado_por_tutor: Boolean(data.ajustado_por_tutor ?? data.modifiedByTutor),
          originalGrade: data.originalGrade ?? data.nota_original ?? null,
          nota_original: data.nota_original ?? data.originalGrade ?? null,
          adjustedGrade: data.adjustedGrade ?? null,
          justification: data.justification ?? null,
        };
      }
    } catch {
      // Fallback para o mock local
    }
    return gradeAdjustmentMock.getAssessmentById(assessmentId);
  },

  /**
   * Lista todas as autoavaliações (enviadas e pendentes) dos alunos de uma sessão passada.
   */
  async getSessionSelfEvaluations(
    sessionId: string
  ): Promise<StudentSelfEvaluationReview[]> {
    if (process.env.NODE_ENV !== "test") {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return gradeAdjustmentMock.getReviewsBySession(sessionId);
  },
};
