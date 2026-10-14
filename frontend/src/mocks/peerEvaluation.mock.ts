// src/mocks/peerEvaluation.mock.ts

// Estados prontos para testar (já existem no evaluationMock):
//   prob_3 -> avaliação entre pares LIBERADA (botão ativado)
//   prob_1 -> só a autoavaliação liberada    (botão desativado)
//   prob_2 -> nada liberado                  (botão desativado)
import { evaluationMock } from "./evaluationMock";
import type { Student } from "../types/student";
import type { PeerEvaluationSubmission } from "../types/evaluation";

export const PEER_EVALUATION_MOCK_PROBLEM_ID = "prob_2";

export const PEER_EVALUATION_MOCK_PEERS: Student[] = [
  {
    id: "student-1",
    name: "Alice Ferreira",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "student-4",
    name: "Mariana Costa Almeida",
    avatarUrl: "",
  },
  {
    id: "student-5",
    name: "Patrício Lima",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "student-6",
    name: "Nicolas Souza",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  },
];

const FAKE_DELAY_MS = 600;

export const peerEvaluationMock = {
  // A avaliação entre pares está aberta quando o tutor liberou o tipo "peer_evaluation"
  isOpen(problemId: string): boolean {
    return evaluationMock.getStatus(problemId).activeType === "peer_evaluation";
  },

  // Simula o POST de envio. Se a avaliação não estiver liberada, o back-end responde 403.
  // O erro tem o mesmo formato do axios (error.response.status), igual ao da autoavaliação.
  async submit(problemId: string, data: PeerEvaluationSubmission): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));

    if (!peerEvaluationMock.isOpen(problemId)) {
      throw Object.assign(new Error("Forbidden"), { response: { status: 403 } });
    }

    // só mostra no console o que seria enviado
    console.log(`[mock] Avaliação entre pares enviada para ${problemId}:`, data);
  },
};
