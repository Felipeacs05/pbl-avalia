// src/components/features/evaluations/StudentSelfEvaluationModal.tsx
"use client";

import React from "react";
import { useEvaluationManager } from "../../../hooks/useEvaluationManager";
import { useMyGroup } from "../../../hooks/useMyGroup";
import { useCriteriaPreset } from "../../../hooks/useCriteriaPreset";
import { isEvaluationTypeReleased } from "../../../types/evaluation";
import { evaluationService } from "../../../services/evaluationService";
import { authMockSuccess } from "../../../mocks/auth.mock";
import { getLoggedUserProfile } from "../../../services/authFetch";
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

  const loggedUser = getLoggedUserProfile();
  const currentStudentId = loggedUser?.id || (typeof window !== "undefined" && localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).id : null) || authMockSuccess.user?.id;
  const peers = group?.members.filter((member) => member.id !== currentStudentId && member.id !== loggedUser?.name) ?? [];

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
        await evaluationService.submitSelfEvaluation(problemId, data);
        onSubmitted?.("Autoavaliação enviada com sucesso!");
      }}
    />
  );
}
