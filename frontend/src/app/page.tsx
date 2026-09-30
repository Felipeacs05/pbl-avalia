"use client";

import React, { useState } from "react";
import { useRooms } from "@/hooks/useRooms";
import { useCopyLink } from "@/hooks/useCopyLink";
import { RoomList } from "@/components/features/rooms/RoomList";
import { CreateRoomModal } from "@/components/features/rooms/CreateRoomModal";
import { EditRoomModal } from "@/components/features/rooms/EditRoomModal";
import { Toast } from "@/components/ui/Toast";
import { BottomTabBar } from "@/components/features/navigation/BottomTabBar";
import type { Room } from "@/types/room";

export default function Home() {
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useRooms();
  const { copyLink, toast, clearToast } = useCopyLink();

  // Controla qual modal está aberto
  const [criandoSala, setCriandoSala] = useState(false);
  const [editando, setEditando] = useState<Room | null>(null);

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">

      <div className="flex-1 px-5 pt-12 pb-40 overflow-y-auto">
        <h1 className="text-2xl font-bold text-center text-[#182860] mb-8 tracking-tight">
          Avalia - Suas Salas
        </h1>

        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse">Carregando salas...</p>
        ) : (
          <RoomList
            rooms={rooms}
            onEdit={(room) => setEditando(room)}
            onCopyLink={(room) => copyLink(room.joinLink)}
            onDelete={(room) => deleteRoom(room.id)}
          />
        )}
      </div>

      {/* Barra inferior com botão "Criar nova sala" */}
      <BottomTabBar onCriarSala={() => setCriandoSala(true)} />

      {/* Modal de criação */}
      {criandoSala && (
        <CreateRoomModal
          onSubmit={createRoom}
          onClose={() => setCriandoSala(false)}
        />
      )}

      {/* Modal de edição — só abre quando editando !== null */}
      {editando && (
        <EditRoomModal
          room={editando}
          onSubmit={(name) => updateRoom(editando.id, name)}
          onClose={() => setEditando(null)}
        />
      )}

      {/* Toast de feedback (ex: "Link copiado!") */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </main>
  );
}
