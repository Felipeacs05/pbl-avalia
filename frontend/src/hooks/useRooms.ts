import { useState, useEffect, useCallback } from "react";
import { Room } from "../types/room";
import { roomService } from "../services/roomService";
import { IS_TEST, USE_REAL_API } from "../services/apiMode";
import { getLoggedUserProfile } from "../services/authFetch";

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Erro ao carregar as salas.";
}

function filterRoomsByRole(rawRooms: Room[], targetRole?: 'teacher' | 'student'): Room[] {
  if (!targetRole || IS_TEST) return rawRooms;
  const currentUser = getLoggedUserProfile();
  if (!currentUser || (!currentUser.id && !currentUser.name)) return rawRooms;

  if (targetRole === 'teacher') {
    return rawRooms.filter((r) => {
      if (r.tutorId && currentUser.id) {
        return r.tutorId === currentUser.id;
      }
      if (r.tutor && currentUser.name) {
        return r.tutor.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
      }
      return false;
    });
  }

  if (targetRole === 'student') {
    return rawRooms.filter((r) => {
      if (r.tutorId && currentUser.id) {
        return r.tutorId !== currentUser.id;
      }
      if (r.tutor && currentUser.name) {
        return r.tutor.trim().toLowerCase() !== currentUser.name.trim().toLowerCase();
      }
      return true;
    });
  }

  return rawRooms;
}

export function useRooms(role?: 'teacher' | 'student') {
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
        if (isActive && Array.isArray(data)) {
          setRooms(filterRoomsByRole(data, role));
        }
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
  }, [role]);

  // Recarga manual (chamada por eventos, fora de effects)
  const refreshRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roomService.fetchRooms();
      if (Array.isArray(data)) {
        setRooms(filterRoomsByRole(data, role));
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [role]);

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
      if (Array.isArray(data)) {
        setRooms(filterRoomsByRole(data, role));
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
    refreshRooms,
  };
}
