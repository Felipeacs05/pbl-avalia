"use client";

// src/app/teacher-rooms/page.tsx

import React, { useState, useEffect } from "react";
import { useRooms } from "../../hooks/useRooms";
import { useCopyLink } from "../../hooks/useCopyLink"; 
import { RoomList } from "../../components/features/rooms/RoomList";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { CreateRoomModal } from "../../components/features/rooms/CreateRoomModal"; // <-- Correção feita aqui!
import { Toast } from "../../components/ui/Toast";
import type { Room } from "../../types/room";

export default function Home() {
  const { rooms, isLoading, createRoom } = useRooms();
  
  const { copyLink, toast: copyToast } = useCopyLink();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localToast, setLocalToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const activeToast = copyToast || localToast;

  const handleEnter = (name: string) => alert(`Entrando na sala: ${name}`);
  const handleEdit = (name: string) => alert(`Editando: ${name}`);

  const handleShare = async (code: string) => {
    await copyLink(`app/join/${code}`);
  };

  const handleCreateRoom = async (name: string) => {
    try {
      await createRoom(name);
      setLocalToast({ message: "Sala criada com sucesso!", type: "success" });
      setIsModalOpen(false); 
    } catch (error) {
      setLocalToast({ message: "Falha ao criar a sala.", type: "error" });
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      
      {activeToast && (
        <div className="absolute z-[70] w-full flex justify-center">
          <Toast 
            message={activeToast.message} 
            type={activeToast.type} 
            onClose={() => setLocalToast(null)} 
          />
        </div>
      )}

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

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col">
        <BottomTabBar activeTab="teacher" onCreateRoom={() => setIsModalOpen(true)} />
      </div>

      {isModalOpen && (
        <CreateRoomModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleCreateRoom} 
        />
      )}
      
    </main>
  );
}