// src/components/features/evaluations/StudentSelfEvaluationModal.tsx
"use client";

import React from "react";
import { useEvaluationManager } from "../../../hooks/useEvaluationManager";
import { useMyGroup } from "../../../hooks/useMyGroup";
import { useCriteriaPreset } from "../../../hooks/useCriteriaPreset";
import { isEvaluationTypeReleased } from "../../../types/evaluation";
import { selfEvaluationMock } from "../../../mocks/selfEvaluation.mock";
import { authMockSuccess } from "../../../mocks/auth.mock";
import { USE_REAL_API } from "../../../services/apiMode";
import { getAuthHeaders, getCurrentUserIdFromToken } from "../../../services/mappers";
import { SelfEvaluationModal } from "./SelfEvaluationModal";

interface StudentSelfEvaluationModalProps {
  roomId: string;
  problemId: string;
  onClose: () => void;
  onSubmitted?: (message: string) => void;
}

const IS_TEST = process.env.NODE_ENV === "test";

// Modal de autoavaliação aberto direto da tela do problema (sem página própria).
// Monte só enquanto estiver aberto: o status liberado pelo tutor e o grupo são buscados a cada abertura.
export function StudentSelfEvaluationModal({
  roomId,
  problemId,
  onClose,
  onSubmitted,
}: StudentSelfEvaluationModalProps) {
  const { evaluationStatus, isLoading: isLoadingStatus } = useEvaluationManager(problemId);
  const { group, isLoading: isLoadingGroup } = useMyGroup(roomId);
  // O pré-set do professor (mesmo id do problema) também vale: toggle desligado = avaliação indisponível
  const { criteria, isLoading: isLoadingPreset } = useCriteriaPreset(problemId);
  const isEnabledInPreset = criteria.find((c) => c.id === "crit_autoavaliacao")?.enabled ?? true;

  const currentStudentId =
    USE_REAL_API && !IS_TEST
      ? getCurrentUserIdFromToken() ?? authMockSuccess.user?.id
      : authMockSuccess.user?.id;
  const peers = group?.members.filter((member) => member.id !== currentStudentId) ?? [];

  // Espera o status e o grupo: sem isso o aluno veria "encerrado" ou uma lista vazia por um instante
  if (isLoadingStatus || isLoadingGroup || isLoadingPreset) return null;

  return (
    <SelfEvaluationModal
      isOpen
      onClose={onClose}
      isEvaluationOpen={isEvaluationTypeReleased(evaluationStatus, "self_evaluation") && isEnabledInPreset}
      peers={peers}
      onSubmit={async (data) => {
        if (USE_REAL_API && !IS_TEST) {
          const avgScore =
            Math.round(
              ((data.scores.content + data.scores.participation + data.scores.behavior) / 3) * 10
            ) / 10;
          const comment =
            data.justification.trim() || "Autoavaliação enviada pelo estudante.";

          const response = await fetch(`/api/v1/problems/${problemId}/self-assessment`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              score: avgScore,
              comment,
            }),
          });

          if (!response.ok) {
            throw { response: { status: response.status } };
          }
        } else {
          await selfEvaluationMock.submit(problemId, data);
        }
        onSubmitted?.("Autoavaliação enviada com sucesso!");
      }}
    />
  );
}
