import type { Room } from "../types/room";
import { roomsMock } from "../mocks/rooms.mock";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api";
import { getAuthHeaders, mapDashboardFromApi, mapRoomFromApi } from "./mappers";

function withAuthInit(init: RequestInit): RequestInit {
  const authHeaders = getAuthHeaders();
  if (Object.keys(authHeaders).length === 0) {
    return init;
  }
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...authHeaders,
    },
  };
}

export const roomService = {
  fetchRooms: async (): Promise<Room[]> => {
    if (!USE_REAL_API) return [...roomsMock];
    const response = await fetch("/api/v1/rooms", withAuthInit({ method: "GET" }));
    if (!response.ok) throw new Error("Failed to fetch rooms");
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: Record<string, unknown>) => {
      if (item && "accessCode" in item && !("code" in item)) {
        return mapRoomFromApi(item);
      }
      return item as unknown as Room;
    });
  },

  fetchRoomById: async (id: string): Promise<Room | null> => {
    if (!USE_REAL_API) {
      const found = roomsMock.find((r) => r.id === id);
      return found ? { ...found, joinLink: `app/join/${found.code}` } : null;
    }
    try {
      const response = await api.get<Record<string, unknown>>(`/rooms/${id}`);
      return mapRoomFromApi(response.data ?? {});
    } catch {
      try {
        const dashboard = await roomService.fetchDashboard();
        return (
          dashboard.roomsAsTutor.find((r) => r.id === id) ??
          dashboard.roomsAsStudent.find((r) => r.id === id) ??
          null
        );
      } catch {
        return null;
      }
    }
  },

  createRoom: async (name: string, description?: string): Promise<Partial<Room>> => {
    if (!USE_REAL_API) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom: Room = {
        id: String(Date.now()),
        name,
        description,
        code,
        joinLink: `app/join/${code}`,
        semester: "2026.2",
      };
      roomsMock.push(newRoom);
      return newRoom;
    }
    const payload = description ? { name, description } : { name };
    const response = await fetch(
      "/api/v1/rooms",
      withAuthInit({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    if (!response.ok) {
      throw new Error("Falha ao criar a sala.");
    }
    const raw = (await response.json()) as Record<string, unknown>;
    if (raw && "accessCode" in raw && !("code" in raw)) {
      const mapped = mapRoomFromApi(raw);
      return {
        ...raw,
        id: mapped.id,
        name: mapped.name,
        description: mapped.description,
        code: mapped.code,
        joinLink: mapped.joinLink,
        semester: mapped.semester,
        tutor: mapped.tutor,
      };
    }
    return raw as Partial<Room>;
  },

  updateRoom: async (roomId: string, name: string, description?: string): Promise<void> => {
    if (!USE_REAL_API) {
      const room = roomsMock.find((r) => r.id === roomId);
      if (room) {
        room.name = name;
        if (description !== undefined) room.description = description;
      }
      return;
    }
    const payload = description !== undefined ? { name, description } : { name };
    const response = await fetch(
      `/api/v1/rooms/${roomId}`,
      withAuthInit({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
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
    const response = await fetch(
      `/api/v1/rooms/${roomId}`,
      withAuthInit({
        method: "DELETE",
      })
    );
    if (!response.ok) {
      throw new Error("Falha ao deletar a sala.");
    }
  },

  fetchDashboard: async (): Promise<{ roomsAsTutor: Room[]; roomsAsStudent: Room[] }> => {
    if (!USE_REAL_API) {
      return {
        roomsAsTutor: await roomService.fetchRooms(),
        roomsAsStudent: [],
      };
    }
    const response = await api.get<Record<string, unknown>>("/users/me/rooms");
    return mapDashboardFromApi(response.data ?? {});
  },
};
