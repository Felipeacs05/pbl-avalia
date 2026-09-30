// ====== ALTERADO POR CLAUDE ====== (arquivo novo)
"use client";

import { useEffect, useState } from "react";
import type { Room } from "@/types/room";
import { roomService } from "@/services/roomService";

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega (ou recarrega) a lista do backend
  async function load() {
    setIsLoading(true);
    try {
      const data = await roomService.fetchRooms();
      setRooms(data);
    } finally {
      setIsLoading(false);
    }
  }

  // Carrega na montagem do componente
  useEffect(() => { load(); }, []);

  // Cria uma sala e recarrega para exibir o item novo
  async function createRoom(name: string): Promise<void> {
    await roomService.createRoom(name);
    await load();
  }

  // Renomeia uma sala e recarrega para refletir o novo nome
  async function updateRoom(id: string, name: string): Promise<void> {
    await roomService.updateRoom(id, name);
    await load();
  }

  // Remove uma sala e recarrega para sumir da lista
  async function deleteRoom(id: string): Promise<void> {
    await roomService.deleteRoom(id);
    await load();
  }

  return { rooms, isLoading, createRoom, updateRoom, deleteRoom };
}
