// src/app/problems/[problemId]/feedbacks/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { FeedbackPanel } from "../../../../components/features/feedbacks/FeedbackPanel";
import { MOCK_FEEDBACK_STUDENTS } from "../../../../mocks/feedback.mock";
import type { FeedbackStudent } from "../../../../types/feedback";

const DEFAULT_E2E_STUDENTS: FeedbackStudent[] = [
  ...MOCK_FEEDBACK_STUDENTS,
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `00000000-0000-4000-a000-${String(i).padStart(12, "0")}`,
    name: `Aluno ${i + 1}`,
  })),
];

export default function ProblemFeedbacksPage() {
  const params = useParams();
  const problemId =
    typeof params?.problemId === "string"
      ? params.problemId
      : "555e5555-e55b-55d5-a555-555555555555";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F7] font-sans px-4 py-8">
      <FeedbackPanel problemId={problemId} students={DEFAULT_E2E_STUDENTS} />
    </main>
  );
}
