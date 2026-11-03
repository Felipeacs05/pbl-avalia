// src/services/studentRoomService.ts
import type { StudentRoom } from "../types/studentRoom";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api";

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
    
    const response = await api.get<any[]>("/rooms/student"); 
    
    // Mapeamento (adapter) para normalizar os dados vindos do Spring Boot
    return response.data.map((item) => ({
      id: item.id,
      name: item.name || "Turma sem nome",
      code: item.accessCode || item.code || "",
      inviteLink: item.inviteLink || item.joinLink || `app/join/${item.accessCode || item.code}`,
      semester: item.semester || "2026.2",
      tutor: item.tutorName || item.tutor || "Professor",
      tutorPhoto: item.tutorPhoto || undefined,
    }));
  },

  async joinRoomByCode(code: string): Promise<StudentRoom> {
    if (!USE_REAL_API) {
      return new Promise((res) =>
        setTimeout(() => {
          const newRoom: StudentRoom = {
            id: String(Date.now()),
            name: `Sala ${code}`,
            code,
            inviteLink: `app/join/${code}`,
            semester: "2026.2",
            tutor: "Professor",
          };
          studentRoomsMock.push(newRoom);
          res(newRoom);
        }, 800)
      );
    }
    
    const response = await api.post<any>(`/rooms/join/${code}`);
    const item = response.data;

    // Normaliza o retorno após entrar via código
    return {
      id: item.id,
      name: item.name || `Sala ${code}`,
      code: item.accessCode || item.code || code,
      inviteLink: item.inviteLink || item.joinLink || `app/join/${code}`,
      semester: item.semester || "2026.2",
      tutor: item.tutorName || item.tutor || "Professor",
      tutorPhoto: item.tutorPhoto || undefined,
    };
  },
};