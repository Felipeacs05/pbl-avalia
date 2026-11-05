import type { Room } from "../types/room";
import { roomsMock } from "../mocks/rooms.mock";
import { USE_REAL_API } from "./apiMode";
import { authFetch } from "./authFetch";

export const roomService = {
  fetchRooms: async (): Promise<Room[]> => {
    if (!USE_REAL_API) return [...roomsMock];
    const response = await authFetch("/api/v1/rooms", { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch rooms");
    return response.json();
  },

  createRoom: async (name: string): Promise<Partial<Room>> => {
    if (!USE_REAL_API) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom: Room = {
        id: String(Date.now()),
        name,
        code,
        joinLink: `app/join/${code}`,
        semester: "2026.2",
      };
      roomsMock.push(newRoom);
      return newRoom;
    }
    const response = await authFetch("/api/v1/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error("Falha ao criar a sala.");
    }
    return response.json();
  },

  updateRoom: async (roomId: string, name: string): Promise<void> => {
    if (!USE_REAL_API) {
      const room = roomsMock.find((r) => r.id === roomId);
      if (room) room.name = name;
      return;
    }
    const response = await authFetch(`/api/v1/rooms/${roomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error("Falha ao atualizar a sala.");
    }
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    if (!USE_REAL_API) {
      const index = roomsMock.findIndex((r) => r.id === roomId);
      if (index > -1) roomsMock.splice(index, 1);
      return;
    }
    const response = await authFetch(`/api/v1/rooms/${roomId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Falha ao excluir a sala.");
    }
  },

  joinRoom: async (accessCode: string): Promise<Room> => {
    const response = await authFetch("/api/v1/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode: accessCode.trim().toUpperCase() }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { response: { status: response.status, data: errorData } };
    }
    return response.json();
  },
};
