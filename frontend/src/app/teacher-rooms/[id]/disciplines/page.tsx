// src/app/teacher-rooms/[id]/disciplines/page.tsx
"use client";

import React, { Suspense, useCallback, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRooms } from "../../../../hooks/useRooms";
import { useDisciplines } from "../../../../hooks/useDiscipline";
import { DisciplineHeader } from "../../../../components/features/disciplines/DisciplineHeader";
import { ProblemCard } from "../../../../components/features/disciplines/ProblemCard";
import { DisciplineTabBar } from "../../../../components/features/disciplines/DisciplineTabBar";
import { PhotoRosterList } from "../../../../components/PhotoRoster/PhotoRosterList";
import { ArrowLeft, Share2, BookOpen } from "lucide-react";
import { CreateProblemModal } from "../../../../components/features/disciplines/CreateProblemModal";
import { problemService } from "../../../../services/problemService";
import { ConfirmModal } from "../../../../components/ui/ConfirmModal";
import { Toast } from "../../../../components/ui/Toast";
import type { Problem } from "../../../../types/discipline";

// Ação dos botões do card de problema que está esperando confirmação
type ProblemAction = { type: "extract" | "delete"; problem: Problem };

function DisciplinesContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = String(params.id);

  const { rooms, isLoading: isLoadingRooms } = useRooms();
  // (refetch, para atualizar a lista depois de excluir)
  const { disciplines, isLoading: isLoadingDisciplines, refetch } =
    useDisciplines(roomId);

  // Deriva a aba ativa diretamente do searchParams (evita useEffect e useState desnecessários)
  const tabParam = searchParams.get("tab");
  const activeTab: "subject" | "groups" | "people" =
    tabParam === "people" ? "people" : "subject";

  const room = rooms.find((r) => r.id === roomId);

  const discipline = disciplines[0] ?? null;

  const isLoading = isLoadingRooms || isLoadingDisciplines;

  // Criar problema: o modal coleta título e descrição; depois de criado, o professor
  // vai direto para o Pré-set de Critérios desse problema (e de lá para a tela do problema).
  const [isCreateProblemOpen, setIsCreateProblemOpen] = useState(false);

  const handleCreateProblem = async (input: { title: string; description: string }) => {
    if (!discipline) throw new Error("Nenhuma disciplina nesta sala.");
    const created = await problemService.createProblem(discipline.id, input);
    router.push(`/teacher-rooms/${roomId}/problems/${created.id}/preset`);
  };

  // Editar problema: o mesmo modal da criação, preenchido; também leva ao Pré-set de Critérios
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);

  const handleEditProblem = async (input: { title: string; description: string }) => {
    if (!editingProblem) return;
    await problemService.updateProblem(editingProblem.id, input);
    await refetch();
    setEditingProblem(null);
    setToastMessage(`Problema "${input.title}" atualizado.`);
  };

  // Botões do card: extrair e excluir abrem o modal de confirmação primeiro; editar vai direto
  const [pendingAction, setPendingAction] = useState<ProblemAction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const clearToast = useCallback(() => setToastMessage(null), []); // função estável: o Toast reinicia o timer se ela mudar

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { type, problem } = pendingAction;

    if (type === "extract") {
      setPendingAction(null);
      // TODO: trocar pela extração real do arquivo quando o back-end existir
      alert("Tela de extração");
    } else {
      await problemService.deleteProblem(problem.id); // se falhar, o modal mostra o erro e continua aberto
      await refetch();
      setPendingAction(null);
      setToastMessage(`Problema "${problem.title}" excluído.`);
    }
  };

  // Textos do modal de confirmação para cada ação
  const confirmTexts = pendingAction && {
    extract: {
      title: "Extrair arquivo",
      message: <>Deseja extrair o arquivo do problema <strong>{pendingAction.problem.title}</strong>?</>,
      confirmLabel: "Extrair",
    },
    delete: {
      title: "Excluir problema",
      message: (
        <>
          Tem certeza que deseja excluir <strong>{pendingAction.problem.title}</strong>? Essa ação não pode ser desfeita.
        </>
      ),
      confirmLabel: "Excluir",
    },
  }[pendingAction.type];

  const handleTabChange = (tab: "subject" | "groups" | "people") => {
    if (tab === "groups") {
      router.push(`/teacher-rooms/${roomId}/groups`);
    } else {
      // Sincroniza alterando a URL sem re-render em cascata
      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (tab === "people") {
        newSearchParams.set("tab", "people");
      } else {
        newSearchParams.delete("tab");
      }
      router.push(`?${newSearchParams.toString()}`, { scroll: false });
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      <div className="bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-40 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/teacher-rooms")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95 cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-[#182860]" />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-[#2E3A70] bg-[#C5CCE8] px-4 sm:px-6 py-1.5 rounded-full tracking-wide">
            {isLoading
              ? "..."
              : room
                ? `${room.code} ${room.semester ?? ""}`
                : "Sala"}
          </span>
        </div>
        <button
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          className="w-9 h-9 rounded-full bg-[#C5CCE8] flex items-center justify-center hover:bg-[#b5bde0] transition-colors active:scale-95 cursor-pointer text-[#2E3A70]"
          aria-label="Compartilhar"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 pt-6 pb-44 overflow-y-auto w-full">
        {activeTab === "people" ? (
          /* ===== CARÔMETRO VIEW ===== */
          <div className="w-full animate-in fade-in duration-200">
            <PhotoRosterList roomId={roomId} />
          </div>
        ) : (
          /* ===== MATÉRIA (PROBLEMAS) VIEW ===== */
          isLoading ? (
            <div className="mt-20 text-center">
              <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400 animate-pulse">
                Carregando disciplina...
              </p>
            </div>
          ) : !discipline ? (
            <div className="mt-20 text-center">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                Nenhuma disciplina cadastrada nesta sala.
              </p>
            </div>
          ) : (
            <div className="space-y-6 w-full animate-in fade-in duration-200">
              {/* Discipline header */}
              <DisciplineHeader
                name={discipline.name}
                description={discipline.description}
                onMessageClass={() => {
                  /* TODO: open message modal */
                }}
              />

              {/* Problem list */}
              <div className="space-y-4 w-full">
                {discipline.problems.map((problem) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    onClick={() => {
                      router.push(
                        `/teacher-rooms/${roomId}/problems/${problem.id}`
                      );
                    }}
                    onViewStats={() => setPendingAction({ type: "extract", problem })}
                    onEdit={() => setEditingProblem(problem)}
                    onDelete={() => setPendingAction({ type: "delete", problem })}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <DisciplineTabBar
        activeTab={activeTab}
        roomId={roomId}
        onTabChange={handleTabChange}
        onNewProblem={
          activeTab === "subject" && discipline
            ? () => setIsCreateProblemOpen(true)
            : undefined
        }
      />

      {pendingAction && confirmTexts && (
        <ConfirmModal
          title={confirmTexts.title}
          message={confirmTexts.message}
          confirmLabel={confirmTexts.confirmLabel}
          variant={pendingAction.type === "delete" ? "danger" : "default"}
          onConfirm={handleConfirmAction}
          onClose={() => setPendingAction(null)}
        />
      )}
      {toastMessage && <Toast message={toastMessage} type="success" onClose={clearToast} />}

      {editingProblem && (
        <CreateProblemModal
          problem={editingProblem}
          onClose={() => setEditingProblem(null)}
          onSubmit={handleEditProblem}
          onEditPreset={() =>
            router.push(`/teacher-rooms/${roomId}/problems/${editingProblem.id}/preset`)
          }
        />
      )}

      {isCreateProblemOpen && (
        <CreateProblemModal
          onClose={() => setIsCreateProblemOpen(false)}
          onSubmit={handleCreateProblem}
        />
      )}
    </main>
  );
}

export default function DisciplinesPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full min-h-screen bg-[#F5F5F5] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <DisciplinesContent />
    </Suspense>
  );
}