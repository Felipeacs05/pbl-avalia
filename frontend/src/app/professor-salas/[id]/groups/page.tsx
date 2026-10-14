'use client';

import React from 'react';
import { TutorGroupsPanel } from '@/components/features/groups/TutorGroupsPanel';
import { ArrowLeft, Share2 } from 'lucide-react';
import { DisciplineTabBar } from '@/components/features/disciplines/DisciplineTabBar';
import { useParams, useRouter } from 'next/navigation';
import { useRooms } from '@/hooks/useRooms';

export default function GroupManagementPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = String(params.id);
  const { rooms, isLoading } = useRooms();
  const room = rooms.find((r) => r.id === roomId);

  const handleBackToDashboard = () => {
    router.push("/teacher-rooms");
  };

  const handleTabChange = (tab: "subject" | "groups" | "people") => {
    if (tab === "subject") {
      router.push(`/professor-salas/${roomId}/disciplinas`);
    } else if (tab === "groups") {
      // Permanece na tela atual
      return;
    } else if (tab === "people") {
      // Sem rota carômetro
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-gray-800 flex flex-col justify-between">
      {/* CABEÇALHO GLOBAL */}
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <button 
          onClick={handleBackToDashboard}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Voltar para salas"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-5 py-1.5 rounded-full tracking-wide">
          {isLoading ? "..." : room ? `${room.code} - ${room.semester ?? ""}` : "Sala"}
        </div>

        <button 
          onClick={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Compartilhar sala"
        >
          <Share2 size={18} className="text-gray-700" />
        </button>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 pb-32">
        <TutorGroupsPanel roomId={roomId} />
      </main>

      {/* BARRA DE NAVEGAÇÃO FIXA INFERIOR */}
      <DisciplineTabBar 
        activeTab="groups" 
        roomId={roomId}
        onTabChange={handleTabChange}
      />
    </div>
  );
}