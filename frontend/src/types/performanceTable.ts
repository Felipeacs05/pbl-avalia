// src/types/performanceTable.ts

export interface Criterion {
  criterionId: string;
  criteriaName: string;
  criteriaDescription?: string;
  criteriaWeight: number;
  status?: string;
}

export interface CriterionWeight {
  criterionId: string;
  criteriaWeight: number;
}

export interface PerformanceTable {
  performanceTableId: string;
  roomId: string;
  tableName: string;
  status: string;
  criteriaList: Criterion[];
}

export interface StudentEvaluationCriteria {
  comportamento: number;
  participacao: number;
  segmentos: number;
  papelPassed: boolean;
  notaPapel: number;
  notaAdicional: number;
}

export interface StudentEvaluationData {
  sessionId: string;
  studentId: string;
  studentName: string;
  criteria: StudentEvaluationCriteria;
  tags: string[];
  message: string;
  updatedAt?: string;
}
