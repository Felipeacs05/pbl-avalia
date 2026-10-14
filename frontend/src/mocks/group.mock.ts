import type { Group, Student } from "../types/group";

export const INITIAL_GROUPS: Group[] = [
  { id: 'g1', name: 'Grupo 1 - Alpha', members: [] },
  { id: 'g2', name: 'Grupo 2 - Beta', members: [] },
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
