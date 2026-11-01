// src/mocks/feedback.mock.ts

import type {
  FeedbackItem,
  FeedbackPayload,
  FeedbackStudentOption,
  SessionStudentSummary,
} from "../types/feedback";

const FEEDBACK_STORAGE_KEY = "avalia_pbl_us16_feedbacks_v1";

export const MOCK_FEEDBACK_STUDENTS: FeedbackStudentOption[] = [
  { id: "stu_alice", name: "Alice Ferreira" },
  { id: "stu_matheus", name: "Matheus Costa" },
  { id: "stu_davi", name: "Davi Oliveira" },
  { id: "stu_beatriz", name: "Beatriz Santos" },
  { id: "stu_gabriel", name: "Gabriel Almeida" },
];

export const MOCK_STUDENT_FEEDBACKS: FeedbackItem[] = [
  {
    id: "fb-1",
    problemId: "prob_01",
    targetType: "CLASS",
    tutorName: "Roberto Oliveira",
    message:
      "O grupo evoluiu bem na construção das hipóteses. Cuidado com o tempo de fala do coordenador...",
    dateLabel: "10/07 - Problema",
  },
  {
    id: "fb-2",
    problemId: "prob_01",
    targetType: "INDIVIDUAL",
    studentId: "stu_alice",
    studentName: "Alice Ferreira",
    tutorName: "Roberto Oliveira",
    message:
      "Sua síntese final foi o ponto alto da sessão. Traga mais referências primárias na próxima...",
    dateLabel: "03/07 - Problema",
    previousGrade: 9.0,
    newGrade: 9.5,
  },
  {
    id: "fb-3",
    problemId: "prob_01",
    targetType: "INDIVIDUAL",
    studentId: "stu_alice",
    studentName: "Alice Ferreira",
    tutorName: "Roberto Oliveira",
    message:
      "Participação caiu em relação à sessão anterior. Prepare os objetivos antes do encontro...",
    dateLabel: "26/06 - Problema",
    previousGrade: 8.5,
    newGrade: 7.9,
  },
  {
    id: "fb-4",
    problemId: "prob_01",
    targetType: "INDIVIDUAL",
    studentId: "stu_alice",
    studentName: "Alice Ferreira",
    tutorName: "Roberto Oliveira",
    message: "Professor alterou sua nota da sessão.",
    dateLabel: "19/06 - Problema",
    previousGrade: 9.8,
    newGrade: 8.1,
  },
];

export const MOCK_SESSION_SUMMARY: SessionStudentSummary = {
  sessionId: "session_01",
  problemTitle: "Problema - FSM Estrutural",
  sessionDate: "08/04",
  roomCode: "EXA613 - 2026.2",
  grade: 7.5,
  isGradeReleased: true,
  isSelfEvaluationOpen: false,
  isPeerEvaluationOpen: false,
  quickTags: [
    "falou bem",
    "trouxe ideias",
    "Boa condução da discussão",
    "Ajude o grupo a fechar o raciocínio antes de passar de etapa.",
    "Cuidado com o tempo de fala do coordenador.",
  ],
};

let memoryFeedbacks: FeedbackItem[] = MOCK_STUDENT_FEEDBACKS.map((item) => ({ ...item }));

export function loadStoredFeedbacks(): FeedbackItem[] {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FeedbackItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryFeedbacks = parsed;
          return memoryFeedbacks;
        }
      }
    } catch {
      // Fallback para memória
    }
  }
  return memoryFeedbacks;
}

export function persistStoredFeedbacks(items: FeedbackItem[]): void {
  memoryFeedbacks = items;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignora erros de quota
    }
  }
}

export function addStoredFeedback(payload: FeedbackPayload): FeedbackItem {
  const current = loadStoredFeedbacks();
  const created: FeedbackItem = {
    id: `fb-${Date.now()}`,
    problemId: payload.problemId,
    sessionId: payload.sessionId,
    targetType: payload.targetType,
    studentId: payload.studentId,
    tutorName: "Roberto Oliveira",
    message: payload.message.trim(),
    dateLabel: "Hoje - Problema",
    newGrade: payload.grade,
  };
  persistStoredFeedbacks([created, ...current]);
  return created;
}
