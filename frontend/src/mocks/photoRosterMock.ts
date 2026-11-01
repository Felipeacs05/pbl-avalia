// src/mocks/photoRosterMock.ts
import type { Student } from "../types/student";

export const initialStudentsMock: Student[] = [
  {
    id: "student-1",
    name: "Alice Ferreira",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    email: "alice.ferreira@universidade.edu.br",
  },
  {
    id: "student-2",
    name: "Matheus Costa",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    email: "matheus.costa@universidade.edu.br",
  },
  {
    id: "student-3",
    name: "Davi Oliveira",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    email: "davi.oliveira@universidade.edu.br",
  },
];

// In-memory store per room ID
const studentsStoreByRoom = new Map<string, Student[]>();

export const photoRosterMock = {
  getStudents(roomId: string): Student[] {
    if (!studentsStoreByRoom.has(roomId)) {
      // Initialize with default students from Figma
      studentsStoreByRoom.set(roomId, [...initialStudentsMock]);
    }
    return [...(studentsStoreByRoom.get(roomId) || [])];
  },

  removeStudent(roomId: string, studentId: string): Student[] {
    const current = this.getStudents(roomId);
    const updated = current.filter((s) => s.id !== studentId);
    studentsStoreByRoom.set(roomId, updated);
    return [...updated];
  },

  reset(): void {
    studentsStoreByRoom.clear();
  },
};
