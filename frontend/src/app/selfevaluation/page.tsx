// src/app/selfevaluation/page.tsx

// Tela isolada de Autoavaliação: só se chega nela digitando http://localhost:3000/selfevaluation.

//   SELF_EVALUATION_MOCK_PROBLEM_ID = "prob_1" -> liberada     (botão ativado)
//   SELF_EVALUATION_MOCK_PROBLEM_ID = "prob_2" -> não liberada (botão desativado)
"use client";

import React, { useState } from "react";
import { ClipboardCheck, Lock } from "lucide-react";
import { useEvaluationManager } from "../../hooks/useEvaluationManager";
import { useMyGroup } from "../../hooks/useMyGroup";
import { SelfEvaluationModal } from "../../components/features/evaluations/SelfEvaluationModal";
import { Toast } from "../../components/ui/Toast";
import {
  selfEvaluationMock,
  SELF_EVALUATION_MOCK_PROBLEM_ID,
  SELF_EVALUATION_MOCK_ROOM_ID,
} from "../../mocks/selfEvaluation.mock";
import { authMockSuccess } from "../../mocks/auth.mock";

export default function SelfEvaluationPage() {
  // quando a tela entrar no fluxo do app, ler estes valores da rota (useParams).
  const roomId = SELF_EVALUATION_MOCK_ROOM_ID;
  const problemId = SELF_EVALUATION_MOCK_PROBLEM_ID;

  const { evaluationStatus, isLoading } = useEvaluationManager(problemId);

  const { group } = useMyGroup(roomId);
  // trocar pelo id do usuário logado quando o login guardar o usuário.
  const currentStudentId = authMockSuccess.user?.id; // user é opcional no tipo AuthResponse
  const peers = group?.members.filter((member) => member.id !== currentStudentId) ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Botão ativado só quando o tipo liberado pelo tutor é a autoavaliação
  const isSelfEvaluationOpen = evaluationStatus.activeType === "self_evaluation";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans flex flex-col items-center justify-center px-5">
      {toastMessage && <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />}

      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        {/* disabled: enquanto carrega ou se a autoavaliação não estiver liberada.
            Mesmo visual do botão "Liberar Avaliações" da tela do tutor. */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || !isSelfEvaluationOpen}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 bg-[#4354A0] hover:bg-[#384890] text-white active:scale-[0.98] cursor-pointer disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isSelfEvaluationOpen || isLoading ? <ClipboardCheck size={18} /> : <Lock size={18} />}
          <span>{isLoading ? "Carregando..." : "Autoavaliação"}</span>
        </button>

        {/* Explica por que o botão está desativado (sem isso, o aluno não sabe o motivo) */}
        {!isLoading && !isSelfEvaluationOpen && (
          <p className="text-xs text-gray-500 text-center">
            A autoavaliação ainda não foi liberada pelo tutor.
          </p>
        )}
      </div>

      <SelfEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEvaluationOpen={isSelfEvaluationOpen}
        peers={peers}
        onSubmit={async (data) => {
          // trocar pelo endpoint real quando o back-end existir
          await selfEvaluationMock.submit(problemId, data);
          setToastMessage("Autoavaliação enviada com sucesso!");
        }}
      />
    </main>
  );
}
