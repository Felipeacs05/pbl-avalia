// src/mocks/selfEvaluation.mock.ts

//   prob_1 -> autoavaliação LIBERADA   (botão ativado)
//   prob_2 -> nada liberado            (botão desativado)
import { evaluationMock } from "./evaluationMock";
import type { SelfEvaluationSubmission } from "../types/evaluation";

export const SELF_EVALUATION_MOCK_PROBLEM_ID = "prob_1";
export const SELF_EVALUATION_MOCK_ROOM_ID = "1";

const FAKE_DELAY_MS = 600;

export const selfEvaluationMock = {
  isOpen(problemId: string): boolean {
    return evaluationMock.getStatus(problemId).activeType === "self_evaluation";
  },

  async submit(problemId: string, data: SelfEvaluationSubmission): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));

    if (!selfEvaluationMock.isOpen(problemId)) {
      throw Object.assign(new Error("Forbidden"), { response: { status: 403 } });
    }
    console.log(`[mock] Autoavaliação enviada para ${problemId}:`, data);
  },
};