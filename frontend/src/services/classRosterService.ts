// src/services/classRosterService.ts
import type { ClassRosterPage, ClassRosterStudent } from "../types/classRoster";

const ROSTER_PAGE_SIZE = 100;

export const classRosterService = {
  async fetchClassRoster(roomId: string): Promise<ClassRosterStudent[]> {
    let currentPage = 0;
    let totalPages = 1;
    const allStudents: ClassRosterStudent[] = [];

    while (currentPage < totalPages) {
      const response = await fetch(
        `/api/v1/rooms/${roomId}/roster?page=${currentPage}&size=${ROSTER_PAGE_SIZE}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar o carômetro da sala.");
      }

      const pageData: ClassRosterPage = await response.json();
      if (Array.isArray(pageData.content)) {
        allStudents.push(...pageData.content);
      }
      totalPages = pageData.totalPages ?? 0;
      currentPage++;
    }

    return allStudents;
  },
};
