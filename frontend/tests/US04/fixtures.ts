import type { Room } from "@/types/room";

export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const OTHER_ROOM_ID = "111e1111-e11b-11d1-a111-111111111111";

// A página ainda tem o usuário fixo no código (sem login real guardado)
export const USER_NAME = "Marlus Rios";
export const USER_EMAIL = "marlus@uefs.br";

// Códigos de VALID_CODES_MOCK (SALA1, SALA2, TEC498, TEC499)
export const VALID_CODE = "TEC499";
export const OTHER_VALID_CODE = "SALA1";
export const INVALID_CODE = "ZZZ99";
// Código que chega pelo link ?codigo=
export const LINK_CODE = "ABC";

export const MAX_FAILED_ATTEMPTS = 5;
export const BLOCK_SECONDS = 15 * 60;

// Títulos dos pop-ups (h3) e textos completos; nas asserções, as regex
export const WRONG_CODE_TITLE = /^código errado$/i;
export const BLOCKED_TITLE = /^muitas tentativas$/i;
export const BLOCKED_MESSAGE = /cerca de 15 min/i;

// Mensagem do interceptor do axios para o 429 (services/api.ts)
export const API_429_TEXT =
    "Muitas tentativas em pouco tempo. Seu acesso foi temporariamente bloqueado. Aguarde alguns minutos e tente novamente.";
export const API_429_MESSAGE = /muitas tentativas em pouco tempo.*temporariamente bloqueado/i;

export function makeRoom(overrides: Partial<Room> = {}): Room {
    return {
        id: ROOM_ID,
        name: "Sistemas Digitais",
        code: "TEC499",
        joinLink: "app/join/TEC499",
        semester: "2026.2",
        tutor: "André Silva",
        ...overrides,
    };
}

export const makeOtherRoom = (): Room =>
    makeRoom({
        id: OTHER_ROOM_ID,
        name: "Circuitos Digitais",
        code: "TEC498",
        joinLink: "app/join/TEC498",
        tutor: "Roberto Oliveira",
    });