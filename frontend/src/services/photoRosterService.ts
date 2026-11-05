// src/services/photoRosterService.ts
import type { Student } from "../types/student";
import { photoRosterMock } from "../mocks/photoRosterMock";
import { USE_REAL_API } from "./apiMode";
import { authFetch } from "./authFetch";

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

    const response = await authFetch(`${BASE_URL}/${roomId}/students`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error("Erro ao carregar alunos da sala.");
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
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

    const response = await authFetch(`${BASE_URL}/${roomId}/students/${studentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error("Erro ao remover aluno da sala.");
    }
    return this.getStudentsByRoom(roomId);
  },
};
