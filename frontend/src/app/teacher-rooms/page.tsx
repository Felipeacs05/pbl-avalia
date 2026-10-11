"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRooms } from "../../hooks/useRooms";
import { useCopyLink } from "../../hooks/useCopyLink";
import { RoomList } from "../../components/features/rooms/RoomList";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { CreateRoomModal } from "../../components/features/rooms/CreateRoomModal";
import { EditRoomModal } from "../../components/features/rooms/EditRoomModal"; // ← ADICIONAR IMPORT
import { Toast } from "../../components/ui/Toast";
import type { Room } from "../../types/room"; // ← ADICIONAR IMPORT

export default function Home() {
  const router = useRouter();
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useRooms();
  const { copyLink, toast: copyToast } = useCopyLink();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // ← ADICIONAR
  const [editingRoom, setEditingRoom] = useState<Room | null>(null); // ← ADICIONAR
  const [localToast, setLocalToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const activeToast = copyToast || localToast;

  const handleEnter = (room: Room) => {
    router.push(`/professor-salas/${room.id}/disciplinas`);
  };

  const handleShare = async (code: string) => {
    await copyLink(`app/join/${code}`);
  };

  const handleCreateRoom = async (name: string) => {
    try {
      await createRoom(name);
      setLocalToast({ message: "Sala criada com sucesso!", type: "success" });
      setIsCreateModalOpen(false);
    } catch {
      setLocalToast({
        message: "Falha ao criar a sala.",
        type: "error",
      });
    }
  };

  // ← ADICIONAR ESTAS FUNÇÕES
  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (newName: string) => {
    if (!editingRoom) return;
    try {
      await updateRoom(editingRoom.id, newName);
      setLocalToast({
        message: "Sala atualizada com sucesso!",
        type: "success",
      });
      setIsEditModalOpen(false);
      setEditingRoom(null);
    } catch {
      setLocalToast({
        message: "Falha ao atualizar a sala.",
        type: "error",
      });
    }
  };

  const handleDelete = async (room: Room) => {
    try {
      await deleteRoom(room.id);
      setLocalToast({
        message: "Sala deletada com sucesso!",
        type: "success",
      });
    } catch {
      setLocalToast({
        message: "Falha ao deletar a sala.",
        type: "error",
      });
    }
  };
  // ← FIM DAS FUNÇÕES NOVAS

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
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse">
            Carregando salas...
          </p>
        ) : (
          <RoomList
            rooms={rooms}
            onEnter={handleEnter}
            onEdit={handleEdit} // ← MUDAR (era handleEdit(room.name), agora passa room)
            onShare={(room) => handleShare(room.code)}
            onDelete={handleDelete} // ← ADICIONAR
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col">
        <BottomTabBar
          activeTab="teacher"
          onCreateRoom={() => setIsCreateModalOpen(true)}
        />
      </div>

      {isCreateModalOpen && (
        <CreateRoomModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateRoom}
        />
      )}

      {/* ← ADICIONAR MODAL DE EDIÇÃO */}
      {isEditModalOpen && editingRoom && (
        <EditRoomModal
          initialName={editingRoom.name}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
        />
      )}
    </main>
  );
}