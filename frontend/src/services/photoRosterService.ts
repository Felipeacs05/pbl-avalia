// src/services/photoRosterService.ts
import type { Student } from "../types/student";
import { photoRosterMock } from "../mocks/photoRosterMock";
import { USE_REAL_API } from "./apiMode";
import { authFetch } from "./authFetch";

const BASE_URL = "/api/v1/rooms";
const FORBIDDEN_REMOVE_MESSAGE = "Apenas o tutor da sala pode remover alunos.";
const DEFAULT_REMOVE_ERROR = "Não foi possível remover o aluno da sala.";

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  } catch {
    // Corpo vazio ou não-JSON: mantém mensagem padrão
  }
  return fallback;
}

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
    });
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(FORBIDDEN_REMOVE_MESSAGE);
      }
      const message = await extractErrorMessage(response, DEFAULT_REMOVE_ERROR);
      throw new Error(message);
    }
    return this.getStudentsByRoom(roomId);
  },
};
