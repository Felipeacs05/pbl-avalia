// src/mocks/photoRosterMock.ts
import type { Student } from "../types/student";

export const initialStudentsMock: Student[] = [
  {
    id: "890a12b3-45c6-78d9-e012-3456789abcde",
    name: "Ana Beatriz Souza",
    avatarUrl: "/uploads/ana.jpg",
    profileImageUrl: "/uploads/ana.jpg",
    initials: "AS",
    email: "ana.souza@universidade.edu.br",
  },
  {
    id: "901b23c4-56d7-89e0-f123-456789abcdef",
    name: "Bruno Costa",
    avatarUrl: "",
    profileImageUrl: null,
    initials: "BC",
    email: "bruno.costa@universidade.edu.br",
  },
  {
    id: "student-1",
    name: "Alice Ferreira",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    profileImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    initials: "AF",
    email: "alice.ferreira@universidade.edu.br",
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
