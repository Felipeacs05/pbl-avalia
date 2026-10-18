// src/services/carometroService.ts
import type { Student } from "../types/student";
import { carometroMock } from "../mocks/carometroMock";

const BASE_URL = "/api/v1/rooms";
const IS_TEST = process.env.NODE_ENV === "test";

export const carometroService = {
  /**
   * Fetches the enrolled students for a specific room/class.
   */
  async getStudentsByRoom(roomId: string): Promise<Student[]> {
    if (!IS_TEST) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(carometroMock.getStudents(roomId));
        }, 300);
      });
    }

    try {
      const response = await fetch(`${BASE_URL}/${roomId}/students`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        return carometroMock.getStudents(roomId);
      }
      return await response.json();
    } catch {
      return carometroMock.getStudents(roomId);
    }
  },

  /**
   * Removes a student from a specific room.
   */
  async removeStudentFromRoom(
    roomId: string,
    studentId: string
  ): Promise<Student[]> {
    if (!IS_TEST) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(carometroMock.removeStudent(roomId, studentId));
        }, 300);
      });
    }

    try {
      const response = await fetch(`${BASE_URL}/${roomId}/students/${studentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        return carometroMock.removeStudent(roomId, studentId);
      }
      return await response.json();
    } catch {
      return carometroMock.removeStudent(roomId, studentId);
    }
  },
};
