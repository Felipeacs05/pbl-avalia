"use client";

import React, { useState } from "react";
import { useRooms } from "../../hooks/useRooms";
import { RoomList } from "../../components/features/rooms/RoomList";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { CreateRoomModal } from "../../components/features/rooms/ModalCreateRoom";

export default function Home() {
  const { rooms, isLoading } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEnter = (name: string) => alert(`Entrando na sala: ${name}`);
  const handleEdit = (name: string) => alert(`Editando: ${name}`);
  const handleShare = (code: string) => alert(`Copiado: ${code}`);

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      
      {/* Conteúdo com scroll (pb-40 para o botão/navbar não cobrirem o último card) */}
      <div className="flex-1 px-5 pt-12 pb-40 overflow-y-auto">
        <h1 className="text-2xl font-bold text-center text-[#182860] mb-8 tracking-tight">
          Avalia - Suas Salas
        </h1>

        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse">Carregando salas...</p>
        ) : (
          <RoomList
            rooms={rooms}
            onEnter={(room) => handleEnter(room.name)}
            onEdit={(room) => handleEdit(room.name)}
            onShare={(room) => handleShare(room.code)}
          />
        )}
      </div>

      {/* Container Fixo Único no Rodapé */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col">

        {/* NavBar limpa */}
        <BottomTabBar onCreateRoom={() => setIsModalOpen(true)} />
      </div>

      {/* Modal de Criação de Sala */}
      {isModalOpen && (
        <CreateRoomModal onClose={() => setIsModalOpen(false)} />
      )}
      
    </main>
  );
}