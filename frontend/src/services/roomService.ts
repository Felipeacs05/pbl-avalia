import { Room } from "../types/room";
import { roomsMock } from "../mocks/rooms.mock";

export const roomService = {
  async fetchRooms(): Promise<Room[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(roomsMock);
      }, 500); // 500ms de atraso para testar o efeito visual de loading
    });
  },
};