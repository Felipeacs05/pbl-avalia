// src/types/evaluation.ts

export type EvaluationType = "self_evaluation" | "peer_evaluation" | null;
export type ReleasableEvaluationType = Exclude<EvaluationType, null>;

export interface EvaluationStatus {
  activeType: EvaluationType;
  // Todas as avaliações liberadas (as duas podem estar abertas ao mesmo tempo); sem ela, vale o activeType
  activeTypes?: ReleasableEvaluationType[];
  isReleased: boolean;
  problemId?: string;
  releasedAt?: string;
}

// Tipos liberados no status, aceitando quem só envia o activeType
export function getReleasedTypes(status: EvaluationStatus): ReleasableEvaluationType[] {
  if (status.activeTypes) return status.activeTypes;
  return status.activeType ? [status.activeType] : [];
}

export function isEvaluationTypeReleased(status: EvaluationStatus, type: ReleasableEvaluationType): boolean {
  return getReleasedTypes(status).includes(type);
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

export type PeerEvaluationScores = SelfEvaluationScores;

export interface PeerEvaluationItem {
  studentId: string;            
  scores: PeerEvaluationScores; 
  comment: string;              
}

export interface PeerEvaluationSubmission {
  evaluations: PeerEvaluationItem[];
}

export interface SelfEvaluationGradeReview {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  score: number | null;
  nota_original: number | null;
  ajustado_por_tutor: boolean;
  justification?: string | null;
  comment?: string;
  status: "submitted" | "pending";
}
