// src/components/features/evaluations/StudentSelfEvaluationModal.tsx
"use client";

import React from "react";
import { useEvaluationManager } from "../../../hooks/useEvaluationManager";
import { useMyGroup } from "../../../hooks/useMyGroup";
import { useCriteriaPreset } from "../../../hooks/useCriteriaPreset";
import { isEvaluationTypeReleased } from "../../../types/evaluation";
import { selfEvaluationMock } from "../../../mocks/selfEvaluation.mock";
import { authMockSuccess } from "../../../mocks/auth.mock";
import { SelfEvaluationModal } from "./SelfEvaluationModal";

interface StudentSelfEvaluationModalProps {
  roomId: string;
  problemId: string;
  onClose: () => void;
  onSubmitted?: (message: string) => void;
}

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

  // trocar pelo id do usuário logado quando o login guardar o usuário
  const currentStudentId = authMockSuccess.user?.id;
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
        // trocar pelo endpoint real quando o back-end existir
        await selfEvaluationMock.submit(problemId, data);
        onSubmitted?.("Autoavaliação enviada com sucesso!");
      }}
    />
  );
}
