import type { EvaluationStatus } from "@/types/evaluation";
import type { ProblemDetails } from "@/types/problem";
import type { Room } from "@/types/room";

// Sala e problema herdados das US anteriores
export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const PROBLEM_ID = "555e5555-e55b-55d5-a555-555555555555";

// Textos exatos exibidos pela tela do tutor
export const SELF_RELEASED_TOAST = "Autoavaliação liberada com sucesso!";
export const PEER_RELEASED_TOAST = "Avaliação entre Pares liberada com sucesso!";
export const DISABLED_TOAST = "Liberação de avaliações desativada.";

// Rótulos do plano de testes (CT-FE-US12-01)
export const OPEN_LABEL = "Avaliações Abertas";
export const CLOSED_LABEL = "Avaliações Fechadas";

// Mensagem de erro no contrato do service: { status, message }
export const SERVER_ERROR_TEXT = "Não foi possível alterar a liberação da avaliação.";
export const SERVER_ERROR_MESSAGE = /não foi possível alterar a liberação/i;
export const makeServerError = () => ({ status: 500, message: SERVER_ERROR_TEXT });

export function makeEvaluationStatus(overrides: Partial<EvaluationStatus> = {}): EvaluationStatus {
    return { problemId: PROBLEM_ID, activeType: null, isReleased: false, ...overrides };
}

export const makeReleasedStatus = (type: "self_evaluation" | "peer_evaluation"): EvaluationStatus =>
    makeEvaluationStatus({ activeType: type, isReleased: true, releasedAt: "2026-10-20T13:00:00Z" });

export function makeRoom(overrides: Partial<Room> = {}): Room {
    return {
        id: ROOM_ID,
        name: "Engenharia de Software",
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
        description: "Prototipação do projeto e do PRD",
        disciplineCode: "TEC499",
        semester: "2026.2",
        sessions: [],
        ...overrides,
    };
}