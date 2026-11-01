// src/mocks/gradeAdjustment.mock.ts

import type {
  GradeAdjustment,
  GradeAdjustmentInput,
  StudentSelfEvaluationReview,
  SubmittedSelfAssessment,
} from "../types/gradeAdjustment";

const STORAGE_KEY = "avalia_pbl_us15_self_evaluations_v1";

const INITIAL_REVIEWS: StudentSelfEvaluationReview[] = [
  {
    id: "151e1515-e15b-15d5-a515-151515151515",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_alice",
    studentName: "Alice Ferreira",
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    status: "submitted",
    score: 10,
    nota_original: 10,
    originalGrade: 10,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "Participei ativamente da abertura e fechamento do problema, trazendo referências.",
  },
  {
    id: "252e2525-e25b-25d5-a525-252525252525",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_matheus",
    studentName: "Matheus Costa",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    status: "submitted",
    score: 9,
    nota_original: 9,
    originalGrade: 9,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "Contribuí na construção das tabelas de excitação e organização do quadro.",
  },
  {
    id: "353e3535-e35b-35d5-a535-353535353535",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_davi",
    studentName: "Davi Oliveira",
    avatarUrl: "https://i.pravatar.cc/150?img=68",
    status: "submitted",
    score: 8.5,
    nota_original: 8.5,
    originalGrade: 8.5,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "Auxiliei na síntese dos objetivos de aprendizagem e revisão final.",
  },
  {
    id: "454e4545-e45b-45d5-a545-454545454545",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_beatriz",
    studentName: "Beatriz Santos",
    avatarUrl: "https://i.pravatar.cc/150?img=32",
    status: "submitted",
    score: 8.5,
    nota_original: 8.5,
    originalGrade: 8.5,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "Boa participação nas discussões do grupo tutorial.",
  },
  {
    id: "555e5555-e55b-55d5-a555-555555555555",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_gabriel",
    studentName: "Gabriel Almeida",
    avatarUrl: "https://i.pravatar.cc/150?img=53",
    status: "submitted",
    score: 9,
    nota_original: 9,
    originalGrade: 9,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "Atuei como relator da sessão e documentei todas as hipóteses.",
  },
  {
    id: "656e6565-e65b-65d5-a565-656565656565",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_camila",
    studentName: "Camila Rocha",
    avatarUrl: "https://i.pravatar.cc/150?img=44",
    status: "pending",
    score: null,
    nota_original: null,
    originalGrade: null,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "",
  },
  {
    id: "757e7575-e75b-75d5-a575-757575757575",
    sessionId: "session_01",
    problemId: "prob_01",
    studentId: "stu_lucas",
    studentName: "Lucas Mendes",
    avatarUrl: "https://i.pravatar.cc/150?img=15",
    status: "pending",
    score: null,
    nota_original: null,
    originalGrade: null,
    adjustedGrade: null,
    ajustado_por_tutor: false,
    modifiedByTutor: false,
    justification: null,
    comment: "",
  },
];

let memoryReviews: StudentSelfEvaluationReview[] = INITIAL_REVIEWS.map((item) => ({
  ...item,
}));

function loadReviews(): StudentSelfEvaluationReview[] {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StudentSelfEvaluationReview[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryReviews = parsed;
          return memoryReviews;
        }
      }
    } catch {
      // Fallback para memória
    }
  }
  return memoryReviews;
}

function persistReviews(reviews: StudentSelfEvaluationReview[]): void {
  memoryReviews = reviews;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    } catch {
      // Ignora erros de quota
    }
  }
}

export const gradeAdjustmentMock = {
  getReviewsBySession(sessionId: string): StudentSelfEvaluationReview[] {
    const all = loadReviews();
    const filtered = all.filter((r) => r.sessionId === sessionId);
    return (filtered.length > 0 ? filtered : all).map((item) => ({ ...item }));
  },

  getAssessmentById(assessmentId: string): SubmittedSelfAssessment {
    const all = loadReviews();
    const found = all.find((item) => item.id === assessmentId);
    if (found) {
      return {
        id: found.id,
        studentId: found.studentId,
        studentName: found.studentName,
        score: found.score ?? 6.0,
        comment: found.comment || "Participei ativamente das sessões",
        modifiedByTutor: found.modifiedByTutor,
        ajustado_por_tutor: found.ajustado_por_tutor,
        originalGrade: found.originalGrade,
        nota_original: found.nota_original,
        adjustedGrade: found.adjustedGrade,
        justification: found.justification,
        avatarUrl: found.avatarUrl,
        status: found.status,
      };
    }

    return {
      id: assessmentId,
      studentId: "999e9999-e99b-99d9-a999-999999999999",
      studentName: "Alice Souza",
      score: 6.0,
      comment: "Participei ativamente das sessões",
      modifiedByTutor: false,
      ajustado_por_tutor: false,
      originalGrade: 6.0,
      nota_original: 6.0,
      adjustedGrade: null,
      justification: null,
      status: "submitted",
    };
  },

  adjustGrade(assessmentId: string, input: GradeAdjustmentInput): GradeAdjustment {
    const trimmedJustification = input.justification?.trim() ?? "";
    if (!trimmedJustification) {
      throw { status: 400, message: "Justificativa é obrigatória" };
    }
    if (
      typeof input.adjustedGrade !== "number" ||
      Number.isNaN(input.adjustedGrade) ||
      input.adjustedGrade < 0 ||
      input.adjustedGrade > 10
    ) {
      throw { status: 400, message: "A nota ajustada deve estar entre 0 e 10" };
    }

    const all = loadReviews();
    const index = all.findIndex((item) => item.id === assessmentId);

    if (index !== -1) {
      const current = all[index];
      const preservedOriginal =
        current.originalGrade ?? current.nota_original ?? current.score ?? 6.0;

      const updated: StudentSelfEvaluationReview = {
        ...current,
        originalGrade: preservedOriginal,
        nota_original: preservedOriginal,
        adjustedGrade: input.adjustedGrade,
        score: input.adjustedGrade,
        justification: trimmedJustification,
        modifiedByTutor: true,
        ajustado_por_tutor: true,
      };

      const nextList = [...all];
      nextList[index] = updated;
      persistReviews(nextList);

      return {
        assessmentId,
        originalGrade: preservedOriginal,
        nota_original: preservedOriginal,
        adjustedGrade: input.adjustedGrade,
        justification: trimmedJustification,
        modifiedByTutor: true,
        ajustado_por_tutor: true,
      };
    }

    // Caso o ID venha de um teste dinâmico fora da lista inicial, adiciona/atualiza em memória
    const fallbackOriginal = 6.0;
    const newEntry: StudentSelfEvaluationReview = {
      id: assessmentId,
      sessionId: "session_01",
      problemId: "prob_01",
      studentId: "999e9999-e99b-99d9-a999-999999999999",
      studentName: "Alice Souza",
      status: "submitted",
      score: input.adjustedGrade,
      nota_original: fallbackOriginal,
      originalGrade: fallbackOriginal,
      adjustedGrade: input.adjustedGrade,
      ajustado_por_tutor: true,
      modifiedByTutor: true,
      justification: trimmedJustification,
      comment: "Participei ativamente das sessões",
    };
    persistReviews([...all, newEntry]);

    return {
      assessmentId,
      originalGrade: fallbackOriginal,
      nota_original: fallbackOriginal,
      adjustedGrade: input.adjustedGrade,
      justification: trimmedJustification,
      modifiedByTutor: true,
      ajustado_por_tutor: true,
    };
  },

  reset(): void {
    persistReviews(INITIAL_REVIEWS.map((item) => ({ ...item })));
  },
};
