"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRooms } from "../../../../hooks/useRooms";
import { useDisciplines } from "../../../../hooks/useDiscipline";
import { DisciplineHeader } from "../../../../components/features/disciplines/DisciplineHeader";
import { ProblemCard } from "../../../../components/features/disciplines/ProblemCard";
import { DisciplineTabBar } from "../../../../components/features/disciplines/DisciplineTabBar";
import { ArrowLeft, Share2, BookOpen } from "lucide-react";

export default function DisciplinesPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params.id);

  const { rooms, isLoading: isLoadingRooms } = useRooms();
  const { disciplines, isLoading: isLoadingDisciplines } =
    useDisciplines(roomId);

  const [activeTab, setActiveTab] = useState<"subject" | "groups" | "people">("subject");

  const room = rooms.find((r) => r.id === roomId);

  // Show the first discipline of the room (as in the design)
  // In the future there may be discipline selection
  const discipline = disciplines[0] ?? null;

  const isLoading = isLoadingRooms || isLoadingDisciplines;

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      {/* Top bar with room code */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-40 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/teacher-rooms")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-[#182860]" />
          </button>
          <span className="text-sm font-semibold text-[#4354A0] bg-[#EEEDF8] px-3 py-1 rounded-full">
            {isLoading
              ? "..."
              : room
              ? `${room.code} - ${room.semester ?? ""}`
              : "Sala"}
          </span>
        </div>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
          aria-label="Compartilhar"
        >
          <Share2 size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 pt-6 pb-44 overflow-y-auto w-full">
        {isLoading ? (
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
          <>
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
                  onViewStats={() => {
                    /* TODO: navigate to statistics */
                  }}
                  onEdit={() => {
                    /* TODO: open edit modal */
                  }}
                  onDelete={() => {
                    /* TODO: confirm deletion */
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <DisciplineTabBar
        activeTab={activeTab}
        roomId={roomId}
        onTabChange={(tab) => {
          if (tab === "groups") {
            router.push(`/professor-salas/${roomId}/groups`);
          } else {
            setActiveTab(tab);
          }
        }}
        onNewProblem={() => {
          /* TODO: open create problem modal */
        }}
      />
    </main>
  );
}
