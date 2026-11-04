// src/app/peerevaluation/page.tsx
"use client";

import React, { useState } from "react";
import { Users, Lock } from "lucide-react";
import { useEvaluationManager } from "../../hooks/useEvaluationManager";
import { isEvaluationTypeReleased } from "../../types/evaluation";
import { PeerEvaluationModal } from "../../components/features/evaluations/PeerEvaluationModal";
import { Toast } from "../../components/ui/Toast";
import { useMyGroup } from "../../hooks/useMyGroup";
import { authMockSuccess } from "../../mocks/auth.mock";
import { getLoggedUserProfile } from "../../services/authFetch";
import {
  peerEvaluationMock,
  PEER_EVALUATION_MOCK_PROBLEM_ID,
  PEER_EVALUATION_MOCK_PEERS,
} from "../../mocks/peerEvaluation.mock";
import { SELF_EVALUATION_MOCK_ROOM_ID } from "../../mocks/selfEvaluation.mock";

export default function PeerEvaluationPage() {
  const roomId = SELF_EVALUATION_MOCK_ROOM_ID;
  const problemId = PEER_EVALUATION_MOCK_PROBLEM_ID;
  const { evaluationStatus, isLoading: isLoadingStatus } = useEvaluationManager(problemId);
  const { group, isLoading: isLoadingGroup } = useMyGroup(roomId);

  const loggedUser = getLoggedUserProfile();
  const currentStudentId = loggedUser?.id || authMockSuccess.user?.id;
  const peers =
    group?.members && group.members.length > 0
      ? group.members
          .filter(
            (member) =>
              member.id !== currentStudentId &&
              member.name !== (loggedUser?.name || authMockSuccess.user?.name)
          )
          .map((member) => ({ avatarUrl: "", ...member }))
      : PEER_EVALUATION_MOCK_PEERS;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isPeerEvaluationOpen = isEvaluationTypeReleased(evaluationStatus, "peer_evaluation");
  const isLoading = isLoadingStatus || isLoadingGroup;

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans flex flex-col items-center justify-center px-5">
      {toastMessage && <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />}

      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        {/* disabled: enquanto carrega ou se a avaliação entre pares não estiver liberada */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || !isPeerEvaluationOpen}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 bg-[#4354A0] hover:bg-[#384890] text-white active:scale-[0.98] cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isPeerEvaluationOpen || isLoading ? <Users size={18} /> : <Lock size={18} />}
          <span>{isLoading ? "Carregando..." : "Avaliação por pares"}</span>
        </button>

        {/* Explica por que o botão está desativado */}
        {!isLoading && !isPeerEvaluationOpen && (
          <p className="text-xs text-gray-500 text-center">
            A avaliação entre pares ainda não foi liberada pelo tutor.
          </p>
        )}
      </div>

      <PeerEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEvaluationOpen={isPeerEvaluationOpen}
        peers={peers}
        onSubmit={async (data) => {
          await peerEvaluationMock.submit(problemId, data);
          setToastMessage("Avaliações enviadas com sucesso!");
        }}
      />
    </main>
  );
}
