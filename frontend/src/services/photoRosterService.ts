// src/services/photoRosterService.ts
import type { Student } from "../types/student";
import { photoRosterMock } from "../mocks/photoRosterMock";
import { USE_REAL_API } from "./apiMode";
import { getAuthHeaders, mapRosterStudentFromApi } from "./mappers";

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
      const response = await fetch(`${BASE_URL}/${roomId}/roster?page=0&size=100`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const page = await response.json();
        const items = Array.isArray(page) ? page : page.content || [];
        return items.map((item: Record<string, unknown>) =>
          mapRosterStudentFromApi(item)
        );
      }
      return photoRosterMock.getStudents(roomId);
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
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        return photoRosterMock.removeStudent(roomId, studentId);
      }
      if (response.status === 204) {
        return await photoRosterService.getStudentsByRoom(roomId);
      }
      return await response.json();
    } catch {
      return photoRosterMock.removeStudent(roomId, studentId);
    }
  },
};
