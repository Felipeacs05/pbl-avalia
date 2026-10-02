import type { Group, Student } from "@/types/group";

export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const GROUP_ID = "222e2222-e22b-22d2-a222-222222222222";
export const OTHER_GROUP_ID = "333e3333-e33b-33d3-a333-333333333333";
export const STUDENT_ID = "444e4444-e44b-44d4-a444-444444444444";
export const OTHER_STUDENT_ID = "555e5555-e55b-55d5-a555-555555555555";
export const NOT_ENROLLED_STUDENT_ID = "666e6666-e66b-66d6-a666-666666666666";

export const ADD_MEMBER_ERROR_MESSAGE = /não foi possível adicionar o aluno/i;

export function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: STUDENT_ID,
    name: "Alice Souza",
    ...overrides,
  };
}

export const makeOtherStudent = (): Student =>
  makeStudent({
    id: OTHER_STUDENT_ID,
    name: "Bruno Lima",
  });

export function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: GROUP_ID,
    name: "Group 1",
    members: [makeStudent()],
    ...overrides,
  };
}

export const makeOtherGroup = (): Group =>
  makeGroup({
    id: OTHER_GROUP_ID,
    name: "Group 2",
    members: [],
  });
