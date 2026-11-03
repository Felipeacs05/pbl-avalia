// src/hooks/useStudentRooms.ts
import { useState, useEffect, useCallback } from "react";
import type { StudentRoom } from "../types/studentRoom";
import { studentRoomService } from "../services/studentRoomService";
import { USE_REAL_API } from "@/services/apiMode";

export function useStudentsRoom() {
  const [rooms, setRooms] = useState<StudentRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await studentRoomService.fetchStudentRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar turmas do aluno:", error);
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await fetchRooms();
      if (mounted) setIsLoading(false);
    }
    init();
    return () => {
      mounted = false;
    };
  }, [fetchRooms]);

  const joinRoom = async (code: string) => {
    const joined = await studentRoomService.joinRoomByCode(code);
    setRooms((prev) => [...prev, joined]);
    if (USE_REAL_API) await fetchRooms();
    return joined;
  };

  return { rooms, isLoading, joinRoom, refreshRooms: fetchRooms };
}