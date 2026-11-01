// src/app/teacher-rooms/[id]/problems/[problemId]/preset/page.tsx

// Pré-set de Critérios de um problema. É a 2ª etapa da criação:
// Disciplinas -> "Criar Problema" -> AQUI -> tela do problema criado.
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { CriteriaPresetPage } from "@/components/features/performance-tables/CriteriaPresetPage";

export default function ProblemCriteriaPresetPage() {
  const params = useParams();
  const router = useRouter();

  const roomId = String(params.id);
  const problemId = String(params.problemId);
  const problemPath = `/teacher-rooms/${roomId}/problems/${problemId}`;

  return (
    <CriteriaPresetPage
      roomId={roomId}
      presetId={problemId}
      // O problema já existe (foi criado no modal); sem salvar, ele fica com o pré-set padrão
      allowSaveWithoutChanges
      // Voltar sobe um nível, como no resto do app: tela do problema
      onBack={() => router.push(problemPath)}
      // replace: o voltar do navegador na tela do problema não reabre o Pré-set
      onSaved={() => router.replace(problemPath)}
    />
  );
}
