// src/hooks/useRooms.ts
import { useState, useEffect, useCallback } from "react";
import type { Room } from "../types/room";
import type { StudentRoom } from "../types/studentRoom";
import { roomService } from "../services/roomService";
import { studentRoomService } from "../services/studentRoomService";
import { USE_REAL_API } from "@/services/apiMode";

export function useRooms() {
  const [roomsAsTutor, setRoomsAsTutor] = useState<Room[]>([]);
  const [roomsAsStudent, setRoomsAsStudent] = useState<StudentRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoomsData = useCallback(async () => {
    try {
      const tutorRooms = await roomService.fetchRooms();

      let studentRooms: StudentRoom[] = [];
      try {
        studentRooms = await studentRoomService.fetchStudentRooms();
      } catch (e) {
        console.warn("Aviso: Não foi possível carregar as salas de estudante", e);
      }

      setRoomsAsTutor(tutorRooms);
      setRoomsAsStudent(studentRooms);
    } catch (error) {
      console.error("Erro ao carregar salas:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await fetchRoomsData();
      if (mounted) setIsLoading(false);
    }
    init();
    return () => {
      mounted = false;
    };
  }, [fetchRoomsData]);

  const createRoom = async (name: string) => {
    const generated = await roomService.createRoom(name);
    if (USE_REAL_API) {
      await fetchRoomsData();
    } else {
      setRoomsAsTutor((prev) => [
        ...prev,
        {
          id: generated.id ?? String(Date.now()),
          name,
          code: generated.code,
          joinLink: generated.joinLink,
          semester: "2026.2",
          tutor: "Marlus Rios",
        },
      ]);
    }
  };

  const updateRoom = async (id: string, name: string) => {
    await roomService.updateRoom(id, name);
    if (USE_REAL_API) {
      await fetchRoomsData();
    } else {
      setRoomsAsTutor((prev) =>
        prev.map((room) => (room.id === id ? { ...room, name } : room))
      );
    }
  };

  const deleteRoom = async (id: string) => {
    await roomService.deleteRoom(id);
    if (USE_REAL_API) {
      await fetchRoomsData();
    } else {
      setRoomsAsTutor((prev) => prev.filter((room) => room.id !== id));
    }
  };

  return {
    rooms: roomsAsTutor,
    roomsAsTutor,
    roomsAsStudent,
    isLoading,
    createRoom,
    updateRoom,
    deleteRoom,
    refreshRooms: fetchRoomsData,
  };
}
