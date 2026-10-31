import { useState, useEffect, useCallback } from "react";
import { Room } from "../types/room";
import { roomService } from "../services/roomService";
import { USE_REAL_API } from "../services/apiMode";

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await roomService.fetchRooms();
      if (Array.isArray(data)) {
        setRooms(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar as salas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRooms();
  }, [fetchAllRooms]);

  const createRoom = async (name: string) => {
    const newRoom = await roomService.createRoom(name);
    const created: Room = {
      id: newRoom?.id || `room-${newRoom?.code || Date.now()}`,
      name: newRoom?.name || name,
      code: newRoom?.code || "",
      joinLink: newRoom?.joinLink || `app/join/${newRoom?.code || ""}`,
      semester: newRoom?.semester || "2026.2",
      ...newRoom,
    };
    setRooms((prev) => [...prev, created]);

    if (USE_REAL_API) {
      const data = await roomService.fetchRooms();
      if (Array.isArray(data)) {
        setRooms(data);
      }
    }
  };

  const updateRoom = async (roomId: string, newName: string) => {
    await roomService.updateRoom(roomId, newName);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name: newName } : r)));
  };

  const deleteRoom = async (roomId: string) => {
    await roomService.deleteRoom(roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  return {
    rooms,
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom,
    refreshRooms: fetchAllRooms,
  };
}
