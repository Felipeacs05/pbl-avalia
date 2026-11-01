// src/services/photoRosterService.ts
import type { Student } from "../types/student";
import { photoRosterMock } from "../mocks/photoRosterMock";
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/rooms";

export const photoRosterService = {
  /**
   * Fetches the enrolled students for a specific room/class.
   */
  async getStudentsByRoom(roomId: string): Promise<Student[]> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(photoRosterMock.getStudents(roomId));
        }, 300);
      });
    }

    try {
      const response = await fetch(`${BASE_URL}/${roomId}/students`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        return photoRosterMock.getStudents(roomId);
      }
      return await response.json();
    } catch {
      return photoRosterMock.getStudents(roomId);
    }
  },

  /**
   * Removes a student from a specific room.
   */
  async removeStudentFromRoom(
    roomId: string,
    studentId: string
  ): Promise<Student[]> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(photoRosterMock.removeStudent(roomId, studentId));
        }, 300);
      });
    }

    try {
      const response = await fetch(`${BASE_URL}/${roomId}/students/${studentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        return photoRosterMock.removeStudent(roomId, studentId);
      }
      return await response.json();
    } catch {
      return photoRosterMock.removeStudent(roomId, studentId);
    }
  },
};
