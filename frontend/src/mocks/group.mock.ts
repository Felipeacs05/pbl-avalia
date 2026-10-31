import type { Group, Student } from "../types/group";

export const INITIAL_GROUPS: Group[] = [
  { id: 'g1', name: 'Grupo 1 - Alpha', roomId: 'e22a84a6-1234-4b55-a8cd-112233445566', members: [] },
  { id: 'g2', name: 'Grupo 2 - Beta', roomId: 'e22a84a6-1234-4b55-a8cd-112233445566', members: [] },
];

export const INITIAL_STUDENTS: Student[] = [
  { id: 's1', name: 'Ana Beatriz Souza' },
  { id: 's2', name: 'Carlos Eduardo Lima' },
  { id: 's3', name: 'Gabriel Santos' },
  { id: 's4', name: 'Mariana Duarte' },
  { id: 's5', name: 'Lucas Pinheiro' },
  { id: 's6', name: 'Juliana Rocha' },
];

class MockGroupBackend {
  groups: Group[] = this.cloneGroups();
  availableStudents: Student[] = [...INITIAL_STUDENTS];

  private cloneGroups() {
    return INITIAL_GROUPS.map((g) => ({ ...g, members: [...g.members] }));
  }

  reset() {
    this.groups = this.cloneGroups();
    this.availableStudents = [...INITIAL_STUDENTS];
  }
}

export const groupMocks = new MockGroupBackend();
