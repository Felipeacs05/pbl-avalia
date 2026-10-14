// src/app/professor-salas/[id]/problems/[problemId]/sessions/[sessionId]/evaluate/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { EvaluationSessionView } from "@/components/features/attendance/EvaluationSessionView";
import { CriteriaWeightsPage } from "@/components/features/performance-tables/CriteriaWeightsPage";
import type { SessionStudent } from "@/types/attendance";

export default function SessionEvaluationPage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id);
  const problemId = String(params.problemId);
  const sessionId = String(params.sessionId);

  const [isEditingPreset, setIsEditingPreset] = React.useState(false);

  const handleBack = () => {
    router.push(`/professor-salas/${roomId}/problems/${problemId}/sessions/${sessionId}`);
  };

  const handleCloseSession = () => {
    // Retorna para a tela de detalhes do problema
    router.push(`/professor-salas/${roomId}/problems/${problemId}`);
  };

  const handleConfigureEvaluation = (student: SessionStudent) => {
    router.push(
      `/professor-salas/${roomId}/problems/${problemId}/sessions/${sessionId}/evaluate/${student.id}`
    );
  };

  if (isEditingPreset) {
    return (
      <CriteriaWeightsPage
        performanceTableId="771a3400-e29b-41d4-b825-112233445566"
        onBack={() => setIsEditingPreset(false)}
      />
    );
  }

  return (
    <EvaluationSessionView
      roomId={roomId}
      problemId={problemId}
      sessionId={sessionId}
      onBack={handleBack}
      onCloseSession={handleCloseSession}
      onConfigureEvaluation={handleConfigureEvaluation}
      onEditPreset={() => setIsEditingPreset(true)}
    />
  );
}
