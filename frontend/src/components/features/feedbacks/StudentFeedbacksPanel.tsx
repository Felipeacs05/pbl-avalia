// src/components/features/feedbacks/StudentFeedbacksPanel.tsx
"use client";

import React from "react";
import { useStudentFeedbacks } from "../../../hooks/useStudentFeedbacks";
import { StudentFeedbackList } from "./StudentFeedbackList";

export interface StudentFeedbacksPanelProps {
  studentId: string;
}

export function StudentFeedbacksPanel({ studentId }: StudentFeedbacksPanelProps) {
  const { feedbacks, isLoading, error } = useStudentFeedbacks(studentId);

  return (
    <section
      aria-label="Meus Feedbacks"
      className="w-full max-w-md mx-auto bg-[#1B2559] rounded-[2rem] p-5 text-white shadow-xl"
      data-testid="student-feedbacks-panel"
    >
      <div className="bg-[#0B1131] rounded-2xl p-4 mb-4">
        <h2 className="text-lg font-bold text-white">Meus Feedbacks</h2>
        <p className="text-xs text-white/70">Mensagens recebidas do tutor</p>
      </div>

      <StudentFeedbackList
        feedbacks={feedbacks}
        isLoading={isLoading}
        error={error}
      />
    </section>
  );
}
