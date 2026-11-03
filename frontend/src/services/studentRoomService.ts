// src/services/studentRoomService.ts
import type { StudentRoom } from "../types/studentRoom";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api";
import { mapStudentRoomFromApi } from "./mappers";

// Mock temporário para testes offline
const studentRoomsMock: StudentRoom[] = [
  {
    id: "sr_1",
    name: "Estrutura de Dados e Algoritmos",
    code: "EDA2026",
    inviteLink: "app/join/EDA2026",
    semester: "2026.2",
    tutor: "Prof. Dr. Fulano",
  },
];

export const studentRoomService = {
  async fetchStudentRooms(): Promise<StudentRoom[]> {
    if (!USE_REAL_API) {
      return new Promise((res) => setTimeout(() => res([...studentRoomsMock]), 500));
    }

    const response = await api.get<Record<string, unknown>[]>("/rooms/student");
    return (Array.isArray(response.data) ? response.data : []).map((item) =>
      mapStudentRoomFromApi(item ?? {})
    );
  },

  async joinRoomByCode(code: string): Promise<StudentRoom> {
    const normalizedCode = code.trim().toUpperCase();

    if (!USE_REAL_API) {
      return new Promise((res) =>
        setTimeout(() => {
          const newRoom: StudentRoom = {
            id: String(Date.now()),
            name: `Sala ${normalizedCode}`,
            code: normalizedCode,
            inviteLink: `app/join/${normalizedCode}`,
            semester: "2026.2",
            tutor: "Professor",
          };
          studentRoomsMock.push(newRoom);
          res(newRoom);
        }, 800)
      );
    }

    const response = await api.post<Record<string, unknown>>(
      `/rooms/join/${encodeURIComponent(normalizedCode)}`
    );
    return mapStudentRoomFromApi(response.data ?? {}, normalizedCode);
  },

  async leaveRoom(roomId: string): Promise<void> {
    if (!USE_REAL_API) {
      const idx = studentRoomsMock.findIndex((r) => r.id === roomId);
      if (idx !== -1) {
        studentRoomsMock.splice(idx, 1);
      }
      return;
    }

    await api.delete(`/rooms/${roomId}/members/me`);
  },
};
