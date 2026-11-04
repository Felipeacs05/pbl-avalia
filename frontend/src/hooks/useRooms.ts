import { useState, useEffect, useCallback } from "react";
import { Room } from "../types/room";
import { roomService } from "../services/roomService";
import { USE_REAL_API } from "../services/apiMode";

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Erro ao carregar as salas.";
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: todos os setState acontecem nos callbacks da Promise
  // (nunca de forma síncrona no corpo do effect — regra react-hooks/set-state-in-effect).
  useEffect(() => {
    let isActive = true;

    roomService
      .fetchRooms()
      .then((data) => {
        if (isActive && Array.isArray(data)) setRooms(data);
      })
      .catch((err: unknown) => {
        if (isActive) setError(toErrorMessage(err));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Recarga manual (chamada por eventos, fora de effects)
  const refreshRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roomService.fetchRooms();
      if (Array.isArray(data)) setRooms(data);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    // Com a API real, sincroniza a lista com o que o servidor gravou
    if (USE_REAL_API) {
      const data = await roomService.fetchRooms();
      if (Array.isArray(data)) setRooms(data);
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
    roomsAsTutor: rooms,
    roomsAsStudent: [] as Room[],
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom,
    refreshRooms,
  };
}
