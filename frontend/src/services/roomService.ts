// src/services/roomService.ts
import type { Room } from "../types/room";
import { roomsMock } from "../mocks/rooms.mock";

const BASE_URL = "/api/v1/rooms";
const IS_TEST = process.env.NODE_ENV === "test";

export const roomService = {
  async fetchRooms(): Promise<Room[]> {
    if (!IS_TEST) {
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
    const response = await fetch(BASE_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  },

  async createRoom(name: string): Promise<{ code: string; joinLink: string }> {
    if (!IS_TEST) {
      return new Promise((res) =>
        setTimeout(() => {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          const joinLink = `app/join/${code}`;
          res({ code, joinLink });
        }, 1000)
      );
    }
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return response.json();
  },

  async updateRoom(id: string, name: string): Promise<void> {
    if (!IS_TEST) return new Promise((res) => setTimeout(() => res(), 500));
    await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  async deleteRoom(id: string): Promise<void> {
    if (!IS_TEST) return new Promise((res) => setTimeout(() => res(), 500));
    await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  },
};