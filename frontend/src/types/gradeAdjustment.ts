// src/types/gradeAdjustment.ts

export type SelfAssessmentReviewStatus = "submitted" | "pending";

export interface SubmittedSelfAssessment {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  comment: string;
  modifiedByTutor: boolean;
  ajustado_por_tutor?: boolean;
  originalGrade?: number | null;
  nota_original?: number | null;
  adjustedGrade?: number | null;
  justification?: string | null;
  avatarUrl?: string;
  status?: SelfAssessmentReviewStatus;
}

export interface GradeAdjustmentInput {
  adjustedGrade: number;
  justification: string;
}

export interface GradeAdjustment {
  assessmentId: string;
  originalGrade: number;
  adjustedGrade: number;
  justification: string;
  modifiedByTutor: boolean;
  ajustado_por_tutor?: boolean;
  nota_original?: number;
}

export interface StudentSelfEvaluationReview {
  id: string;
  sessionId: string;
  problemId: string;
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  status: SelfAssessmentReviewStatus;
  score: number | null;
  nota_original: number | null;
  originalGrade: number | null;
  adjustedGrade: number | null;
  ajustado_por_tutor: boolean;
  modifiedByTutor: boolean;
  justification: string | null;
  comment: string;
}
