// src/app/teacher-rooms/[id]/problems/[problemId]/sessions/[sessionId]/evaluate/[studentId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentPerformanceTableView } from "@/components/features/performance-tables/StudentPerformanceTableView";

export default function StudentPerformanceTablePage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id);
  const problemId = String(params.problemId);
  const sessionId = String(params.sessionId);
  const studentId = String(params.studentId);

  const handleBack = () => {
    router.push(
      `/teacher-rooms/${roomId}/problems/${problemId}/sessions/${sessionId}/evaluate`
    );
  };

  return (
    <StudentPerformanceTableView
      roomId={roomId}
      problemId={problemId}
      sessionId={sessionId}
      studentId={studentId}
      onBack={handleBack}
    />
  );
}
