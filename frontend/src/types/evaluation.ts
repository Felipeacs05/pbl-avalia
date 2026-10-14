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
