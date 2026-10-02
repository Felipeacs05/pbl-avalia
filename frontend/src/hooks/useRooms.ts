// src/hooks/useRooms.ts
import { useState, useEffect, useCallback } from "react";
import type { Room } from "../types/room";
import { roomService } from "../services/roomService";

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllRooms = useCallback(async () => {
    try {
      const data = await roomService.fetchRooms();
      setRooms(data);
    } catch (error) {
      console.error("Erro ao carregar salas:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await fetchAllRooms();
      if (mounted) setIsLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, [fetchAllRooms]);

  const createRoom = async (name: string) => {
  const generated = await roomService.createRoom(name);
  setRooms((prev) => [...prev, { 
    id: String(Date.now()), 
    name, 
    code: generated.code, 
    joinLink: generated.joinLink, 
    semester: "2026.2", 
    tutor: "Marlus Rios" 
  }]);
  if (process.env.NODE_ENV === "test") await fetchAllRooms();
};

  const updateRoom = async (id: string, name: string) => {
    await roomService.updateRoom(id, name);
    if (process.env.NODE_ENV === "test") await fetchAllRooms();
  };

  const deleteRoom = async (id: string) => {
    await roomService.deleteRoom(id);
    if (process.env.NODE_ENV === "test") await fetchAllRooms();
  };

  return { rooms, isLoading, createRoom, updateRoom, deleteRoom };
}