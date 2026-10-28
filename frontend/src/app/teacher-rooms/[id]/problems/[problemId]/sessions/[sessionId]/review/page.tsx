// src/app/teacher-rooms/[id]/problems/[problemId]/sessions/[sessionId]/review/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { EvaluationReviewView } from "../../../../../../../../components/features/evaluations/EvaluationReviewView";

export default function SessionSelfEvaluationReviewPage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id ?? "1");
  const problemId = String(params.problemId ?? "prob_01");
  const sessionId = String(params.sessionId ?? "session_01");

  return (
    <EvaluationReviewView
      roomId={roomId}
      problemId={problemId}
      sessionId={sessionId}
      onBack={() =>
        router.push(`/teacher-rooms/${roomId}/problems/${problemId}`)
      }
    />
  );
}
