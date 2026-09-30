// os testes de integração substituem o fetch global com vi.stubGlobal.
import type { Room } from "@/types/room";

const BASE = "/api/v1/rooms";

export const roomService = {
  // Busca todas as salas do professor autenticado
  async fetchRooms(): Promise<Room[]> {
    const res = await fetch(BASE);
    return res.json() as Promise<Room[]>;
  },

  // Cria uma sala com o nome dado; o backend devolve code e joinLink
  async createRoom(name: string): Promise<Pick<Room, "code" | "joinLink">> {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return res.json() as Promise<Pick<Room, "code" | "joinLink">>;
  },

  // Atualiza o nome de uma sala existente
  async updateRoom(id: string, name: string): Promise<void> {
    await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  // Remove uma sala pelo id
  async deleteRoom(id: string): Promise<void> {
    await fetch(`${BASE}/${id}`, { method: "DELETE" });
  },
};
