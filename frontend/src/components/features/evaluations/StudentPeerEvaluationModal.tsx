// src/components/features/evaluations/StudentPeerEvaluationModal.tsx
"use client";

import React from "react";
import { useEvaluationManager } from "../../../hooks/useEvaluationManager";
import { useMyGroup } from "../../../hooks/useMyGroup";
import { useCriteriaPreset } from "../../../hooks/useCriteriaPreset";
import { isEvaluationTypeReleased } from "../../../types/evaluation";
import { peerEvaluationMock } from "../../../mocks/peerEvaluation.mock";
import { authMockSuccess } from "../../../mocks/auth.mock";
import { getLoggedUserProfile } from "../../../services/authFetch";
import { PeerEvaluationModal } from "./PeerEvaluationModal";

interface StudentPeerEvaluationModalProps {
  roomId: string;
  problemId: string;
  onClose: () => void;
  onSubmitted?: (message: string) => void;
}

// Modal de avaliação entre pares aberto direto da tela do problema (sem página própria).
// Monte só enquanto estiver aberto: o status liberado pelo tutor e o grupo são buscados a cada abertura.
export function StudentPeerEvaluationModal({
  roomId,
  problemId,
  onClose,
  onSubmitted,
}: StudentPeerEvaluationModalProps) {
  const { evaluationStatus, isLoading: isLoadingStatus } = useEvaluationManager(problemId);
  const { group, isLoading: isLoadingGroup } = useMyGroup(roomId);
  // O pré-set do professor (mesmo id do problema) também vale: toggle desligado = avaliação indisponível
  const { criteria, isLoading: isLoadingPreset } = useCriteriaPreset(problemId);
  const isEnabledInPreset = criteria.find((c) => c.id === "crit_pares")?.enabled ?? true;

  // colegas do grupo, sem o aluno logado
  const loggedUser = getLoggedUserProfile();
  const currentStudentId = loggedUser?.id || (typeof window !== "undefined" && localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).id : null) || authMockSuccess.user?.id;
  const peers = group?.members
      .filter((member) => member.id !== currentStudentId && member.id !== loggedUser?.name)
      .map((member) => ({ avatarUrl: "", ...member })) ?? [];

  if (isLoadingStatus || isLoadingGroup || isLoadingPreset) return null;

  return (
    <PeerEvaluationModal
      isOpen
      onClose={onClose}
      isEvaluationOpen={isEvaluationTypeReleased(evaluationStatus, "peer_evaluation") && isEnabledInPreset}
      peers={peers}
      onSubmit={async (data) => {
        // trocar pelo endpoint real quando o back-end existir
        await peerEvaluationMock.submit(problemId, data);
        onSubmitted?.("Avaliações enviadas com sucesso!");
      }}
    />
  );
}
