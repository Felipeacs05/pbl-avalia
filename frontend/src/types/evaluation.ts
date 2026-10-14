// src/types/evaluation.ts

export type EvaluationType = "self_evaluation" | "peer_evaluation" | null;

export interface EvaluationStatus {
  activeType: EvaluationType;
  isReleased: boolean;
  problemId?: string;
  releasedAt?: string;
}

export interface EvaluationOptionConfig {
  id: "self_evaluation" | "peer_evaluation";
  title: string;
  description: string;
}

// Uma nota de 0 a 10 para cada critério do Figma e uma justificativa opcional.
export interface SelfEvaluationScores {
  content: number;       // Bom seguimento e conteúdo
  participation: number; // Participação
  behavior: number;      // Comportamento
}

// Avaliação de um colega do grupo: uma nota de 0 a 10 e um comentário opcional
export interface PeerEvaluation {
  studentId: string; // id do colega avaliado
  score: number;
  comment: string;   // opcional: vai vazio ("") se o aluno não escrever nada
}

export interface SelfEvaluationSubmission {
  scores: SelfEvaluationScores;
  justification: string; // opcional: vai vazio ("") se o aluno não escrever nada
  peers: PeerEvaluation[]; // uma entrada por colega do grupo 
}
