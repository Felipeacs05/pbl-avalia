// src/services/roomService.ts
import type { Room } from "../types/room";
import { roomsMock } from "../mocks/rooms.mock";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api"; // Importa o axios configurado com URL do backend e token JWT

export const roomService = {
  async fetchRooms(): Promise<Room[]> {
    if (!USE_REAL_API) {
      return new Promise((res) =>
        setTimeout(
          () =>
            res(
              roomsMock.map((room) => ({
                ...room,
                joinLink: `app/join/${room.code}`,
              }))
            ),
          500
        )
      );
    }
    const response = await api.get<any[]>("/rooms/tutor");
    
    // Mapeia os dados do backend para o formato exato que a interface Room do frontend espera
    return response.data.map((item) => ({
      id: item.id,
      name: item.name || "Sala sem nome",
      code: item.accessCode || item.code || "",
      joinLink: item.inviteLink || item.joinLink || `app/join/${item.accessCode || item.code}`,
      semester: item.semester || "2026.2", // Valor padrão caso o backend não envie
      tutor: item.tutorName || item.tutor || "Professor", // Mapeia o nome do tutor
      tutorPhoto: item.tutorPhoto || undefined,
    }));
  },

  async createRoom(name: string): Promise<{ code: string; joinLink: string }> {
    if (!USE_REAL_API) {
      return new Promise((res) =>
        setTimeout(() => {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          const joinLink = `app/join/${code}`;
          res({ code, joinLink });
        }, 1000)
      );
    }
    const response = await api.post("/rooms", { name });
    return response.data;
  },

  async updateRoom(id: string, name: string): Promise<void> {
    if (!USE_REAL_API) return new Promise((res) => setTimeout(() => res(), 500));
    await api.put(`/rooms/${id}`, { name });
  },

  async deleteRoom(id: string): Promise<void> {
    if (!USE_REAL_API) return new Promise((res) => setTimeout(() => res(), 500));
    await api.delete(`/rooms/${id}`);
  },

  async fetchDashboard(): Promise<{ roomsAsTutor: Room[]; roomsAsStudent: Room[] }> {
    if (!USE_REAL_API) {
      // Mock temporário para testes locais
      return {
        roomsAsTutor: await this.fetchRooms(),
        roomsAsStudent: [],
      };
    }
    const response = await api.get("/dashboard"); // Ajuste para a rota de dashboard do seu backend se houver, ou separe os endpoints
    return response.data;
  }
};