import type { ClassRosterPage, ClassRosterStudent } from "@/types/classRoster";

// Os testes de backend da US18 usam UUIDs aleatórios; aqui ficam fixos, com sala e alunos herdados das US anteriores
export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "456e4567-e45b-45d4-a456-456745674567";
export const THIRD_STUDENT_ID = "181e1818-e18b-18d1-a181-181818181818";

// Mesmos nomes, URLs e iniciais dos testes de backend da US18
// "MS" (primeiro + último nome) e não "MC": prova que as iniciais vêm do backend, não de um cálculo no front
export const STUDENT_NAME = "Maria Clara Souza";
export const STUDENT_INITIALS = "MS";
export const STUDENT_PHOTO_URL = "https://img.uefs.br/maria.png";

// Página máxima aceita pelo backend (PaginationUtils.MAX_PAGE_SIZE): menos requisições no 4G
export const ROSTER_PAGE_SIZE = 100;

// Aluno como o backend devolve (ClassRosterDTO): id, name, profileImageUrl e initials
export function makeRosterStudent(overrides: Partial<ClassRosterStudent> = {}): ClassRosterStudent {
  return {
    id: STUDENT_ID,
    name: STUDENT_NAME,
    profileImageUrl: STUDENT_PHOTO_URL,
    initials: STUDENT_INITIALS,
    ...overrides,
  };
}

// Aluno sem foto cadastrada: o backend manda a URL nula e as iniciais preenchidas
export const makeStudentWithoutPhoto = (): ClassRosterStudent =>
  makeRosterStudent({ id: OTHER_STUDENT_ID, name: "João", profileImageUrl: null, initials: "J" });

export const makeThirdStudent = (): ClassRosterStudent =>
  makeRosterStudent({
    id: THIRD_STUDENT_ID,
    name: "Pedro Henrique",
    profileImageUrl: "https://img.uefs.br/pedro.png",
    initials: "PH",
  });

// Página como o backend devolve (PageResponse)
export function makeRosterPage(
  content: ClassRosterStudent[],
  { page = 0, totalElements = content.length, totalPages = content.length === 0 ? 0 : 1 } = {},
): ClassRosterPage {
  return { content, page, size: ROSTER_PAGE_SIZE, totalElements, totalPages };
}
