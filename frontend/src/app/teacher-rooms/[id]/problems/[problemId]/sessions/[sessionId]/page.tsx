// src/app/teacher-rooms/[id]/problems/[problemId]/sessions/[sessionId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AttendanceSessionView } from "@/components/features/attendance/AttendanceSessionView";
import { authFetch } from "@/services/authFetch";

export default function SessionAttendancePage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id);
  const problemId = String(params.problemId);
  const sessionId = String(params.sessionId);

  const handleBack = () => {
    router.push(`/teacher-rooms/${roomId}/problems/${problemId}`);
  };

  const handleEndSession = async () => {
    try {
      await authFetch(`/api/v1/sessions/${sessionId}/end`, { method: "POST" });
    } catch {
      // Ignora erro e prossegue
    }
    router.push(`/teacher-rooms/${roomId}/problems/${problemId}/sessions/${sessionId}/evaluate`);
  };

  return (
    <AttendanceSessionView
      roomId={roomId}
      problemId={problemId}
      sessionId={sessionId}
      onBack={handleBack}
      onEndSession={handleEndSession}
    />
  );
}
