// src/app/professor-salas/[id]/problems/[problemId]/sessions/[sessionId]/evaluate/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { EvaluationSessionView } from "@/components/features/attendance/EvaluationSessionView";

export default function SessionEvaluationPage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id);
  const problemId = String(params.problemId);
  const sessionId = String(params.sessionId);

  const handleBack = () => {
    router.push(`/professor-salas/${roomId}/problems/${problemId}/sessions/${sessionId}`);
  };

  const handleCloseSession = () => {
    // Retorna para a tela de detalhes do problema
    router.push(`/professor-salas/${roomId}/problems/${problemId}`);
  };

  return (
    <EvaluationSessionView
      roomId={roomId}
      problemId={problemId}
      sessionId={sessionId}
      onBack={handleBack}
      onCloseSession={handleCloseSession}
    />
  );
}
