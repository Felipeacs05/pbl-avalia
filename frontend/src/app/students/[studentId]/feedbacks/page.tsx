// src/app/students/[studentId]/feedbacks/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { StudentFeedbacksPanel } from "../../../../components/features/feedbacks/StudentFeedbacksPanel";

export default function StudentFeedbacksPage() {
  const params = useParams();
  const studentId =
    typeof params?.studentId === "string"
      ? params.studentId
      : "999e9999-e99b-99d9-a999-999999999999";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F7] font-sans px-4 py-8">
      <StudentFeedbacksPanel studentId={studentId} />
    </main>
  );
}
