// src/types/feedback.ts

export type FeedbackTargetType = "INDIVIDUAL" | "CLASS";

export interface FeedbackStudent {
  id: string;
  name: string;
}

export type FeedbackStudentOption = FeedbackStudent;

export interface Feedback {
  id: string;
  problemId: string;
  studentId: string;
  grade: number;
  text: string;
}

export interface FeedbackInput {
  grade: number | null;
  text: string;
}

export interface FeedbackBatchItem {
  studentId: string;
  grade: number | null;
  text: string;
}

export interface StudentFeedback {
  tutorName: string;
  problemTitle: string;
  grade: number;
  text: string;
  createdAt: string;
}

export interface StudentFeedbackPageResponse {
  content: StudentFeedback[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FeedbackPayload {
  problemId: string;
  sessionId?: string;
  targetType: FeedbackTargetType;
  studentId?: string;
  message: string;
  grade?: number;
}

export interface FeedbackItem {
  id: string;
  problemId: string;
  sessionId?: string;
  targetType: FeedbackTargetType;
  studentId?: string;
  studentName?: string;
  tutorName: string;
  message: string;
  dateLabel: string;
  previousGrade?: number;
  newGrade?: number;
}

export interface SessionStudentSummary {
  sessionId: string;
  problemTitle: string;
  sessionDate: string;
  roomCode: string;
  grade: number | null;
  isGradeReleased: boolean;
  isSelfEvaluationOpen: boolean;
  isPeerEvaluationOpen: boolean;
  quickTags: string[];
}
