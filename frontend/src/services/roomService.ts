// src/services/roomService.ts
import type { Room } from "../types/room";
import { roomsMock } from "../mocks/rooms.mock";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api";
import { mapDashboardFromApi, mapRoomFromApi } from "./mappers";

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
    const response = await api.get<Record<string, unknown>[]>("/rooms/tutor");
    return (Array.isArray(response.data) ? response.data : []).map((item) =>
      mapRoomFromApi(item ?? {})
    );
  },

  async fetchRoomById(id: string): Promise<Room | null> {
    if (!USE_REAL_API) {
      const found = roomsMock.find((r) => r.id === id);
      return found ? { ...found, joinLink: `app/join/${found.code}` } : null;
    }
    try {
      const response = await api.get<Record<string, unknown>>(`/rooms/${id}`);
      return mapRoomFromApi(response.data ?? {});
    } catch {
      try {
        const dashboard = await this.fetchDashboard();
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

  async createRoom(
    name: string
  ): Promise<{ id?: string; name?: string; code: string; joinLink: string }> {
    if (!USE_REAL_API) {
      return new Promise((res) =>
        setTimeout(() => {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          const joinLink = `app/join/${code}`;
          res({ code, joinLink });
        }, 1000)
      );
    }
    const response = await api.post<Record<string, unknown>>("/rooms", { name });
    const raw = response.data ?? {};
    const code = String(raw.accessCode ?? raw.code ?? "");
    const joinLink = String(
      raw.inviteLink ?? raw.joinLink ?? (code ? `app/join/${code}` : "")
    );
    return {
      ...(raw.id ? { id: String(raw.id) } : {}),
      ...(raw.name ? { name: String(raw.name) } : {}),
      code,
      joinLink,
    };
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
      return {
        roomsAsTutor: await this.fetchRooms(),
        roomsAsStudent: [],
      };
    }
    const response = await api.get<Record<string, unknown>>("/users/me/rooms");
    return mapDashboardFromApi(response.data ?? {});
  },
};
