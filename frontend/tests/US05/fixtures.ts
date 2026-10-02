import type { Problem } from "@/types/problem";

export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const PROBLEM_ID = "555e5555-e55b-55d5-a555-555555555555";
export const OTHER_PROBLEM_ID = "666e6666-e66b-66d6-a666-666666666666";

export const TITLE_VALIDATION_MESSAGE = /título é obrigatório/i;
export const FORBIDDEN_MESSAGE = /apenas o tutor da sala/i;

export function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: PROBLEM_ID,
    title: "Problem 1",
    ...overrides,
  };
}

export const makeOtherProblem = (): Problem =>
  makeProblem({
    id: OTHER_PROBLEM_ID,
    title: "Problem 2",
  });
