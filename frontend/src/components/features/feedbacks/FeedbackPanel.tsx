// src/components/features/feedbacks/FeedbackPanel.tsx
"use client";

import React from "react";
import { useFeedbacks } from "../../../hooks/useFeedbacks";
import { FeedbackComposer } from "./FeedbackComposer";
import type { FeedbackInput, FeedbackStudent } from "../../../types/feedback";

export interface FeedbackPanelProps {
  problemId: string;
  students: FeedbackStudent[];
}

export function FeedbackPanel({ problemId, students }: FeedbackPanelProps) {
  const { isSending, sentFeedbacks, error, sendToStudent, sendToClass } =
    useFeedbacks(problemId);

  const handleSendToStudent = async (studentId: string, input: FeedbackInput) => {
    await sendToStudent(studentId, input);
  };

  const handleSendToClass = async (input: FeedbackInput) => {
    const classIds = students.map((student) => student.id);
    await sendToClass(classIds, input);
  };

  return (
    <div className="w-full max-w-xl mx-auto" data-testid="feedback-panel">
      <FeedbackComposer
        students={students}
        isSending={isSending}
        error={error}
        sentFeedbacks={sentFeedbacks}
        onSendToStudent={handleSendToStudent}
        onSendToClass={handleSendToClass}
      />
    </div>
  );
}
