import type { Discipline, Problem } from "@/types/discipline";
import type { ProblemDetails } from "@/types/problem";
import type { Room } from "@/types/room";

// Ids fixos, no mesmo padrão das demais US
export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const OTHER_ROOM_ID = "111e1111-e11b-11d1-a111-111111111111";
export const DISCIPLINE_ID = "d15e0001-e11b-11d1-a001-000000000001";
export const OTHER_DISCIPLINE_ID = "d15e0002-e11b-11d1-a002-000000000002";
export const MISSING_DISCIPLINE_ID = "d15e0999-e11b-11d1-a999-000000000999";
export const PROBLEM_ID = "555e5555-e55b-55d5-a555-555555555555";
export const OTHER_PROBLEM_ID = "666e6666-e66b-66d6-a666-666666666666";
export const NEW_PROBLEM_ID = "777e7777-e77b-77d7-a777-777777777777";
export const OTHER_ROOM_PROBLEM_ID = "888e8888-e88b-88d8-a888-888888888888";

// Mesmo limite do input de título do CreateProblemModal
export const TITLE_MAX_LENGTH = 100;

// Textos completos usados nas telas; nas asserções, as regex
export const TITLE_REQUIRED_TEXT = "O título do problema não pode ficar vazio.";
export const TITLE_REQUIRED_MESSAGE = /o título do problema não pode ficar vazio/i;
export const CREATE_FAILURE_MESSAGE = /não foi possível criar o problema/i;
export const EDIT_FAILURE_MESSAGE = /não foi possível salvar o problema/i;
export const ACTION_FAILURE_MESSAGE = /não foi possível concluir a ação/i;

// Mensagens genéricas do service atual (o que ele lança hoje)
export const CREATE_ERROR_TEXT = "Falha ao criar o problema.";

// O 403 do @PreAuthorize vem com mensagem genérica em inglês; a interface deve mostrar esta, em português
export const FORBIDDEN_TEXT = "Apenas o tutor responsável pela sala pode gerenciar problemas.";
export const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode gerenciar problemas/i;
export const BACKEND_FORBIDDEN_BODY = {
    timestamp: "2026-10-20T10:00:00",
    status: 403,
    error: "Forbidden",
    message: "You do not have permission to perform this operation",
};

export function makeProblem(overrides: Partial<Problem> = {}): Problem {
    return {
        id: PROBLEM_ID,
        title: "Problema 1",
        description: "Projeto de FSM com tabelas de excitação",
        ...overrides,
    };
}

export const makeOtherProblem = (): Problem =>
    makeProblem({
        id: OTHER_PROBLEM_ID,
        title: "Problema 2",
        description: "Interação com nível de portas lógicas e datapath",
    });

// Problema criado depois dos dois primeiros: precisa ficar no fim da lista
export const makeNewProblem = (): Problem =>
    makeProblem({ id: NEW_PROBLEM_ID, title: "Problema 3", description: "Controlador de semáforo" });

export function makeDiscipline(overrides: Partial<Discipline> = {}): Discipline {
    return {
        id: DISCIPLINE_ID,
        name: "Circuitos Digitais",
        description: "Laboratório e tutoriais de portas lógicas e sistemas sequenciais.",
        roomId: ROOM_ID,
        problems: [makeProblem(), makeOtherProblem()],
        ...overrides,
    };
}

// Disciplina de outra sala: os hooks não podem misturá-la com a da sala atual
export const makeOtherRoomDiscipline = (): Discipline =>
    makeDiscipline({
        id: OTHER_DISCIPLINE_ID,
        name: "Sistemas Digitais",
        roomId: OTHER_ROOM_ID,
        problems: [makeProblem({ id: OTHER_ROOM_PROBLEM_ID, title: "Problema A" })],
    });

// Conteúdo do "banco" falso que substitui o gradeMock real nos testes
export const makeGradeMock = (): Discipline[] => [makeDiscipline(), makeOtherRoomDiscipline()];

export function makeRoom(overrides: Partial<Room> = {}): Room {
    return {
        id: ROOM_ID,
        name: "Circuitos Digitais",
        code: "TEC499",
        joinLink: "app/join/TEC499",
        semester: "2026.2",
        ...overrides,
    };
}

export function makeProblemDetails(overrides: Partial<ProblemDetails> = {}): ProblemDetails {
    return {
        id: PROBLEM_ID,
        title: "Problema 1",
        description: "Projeto de FSM com tabelas de excitação",
        disciplineCode: "TEC499",
        semester: "2026.2",
        sessions: [],
        ...overrides,
    };
}