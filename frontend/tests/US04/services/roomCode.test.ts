import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    BLOCK_SECONDS,
    INVALID_CODE,
    MAX_FAILED_ATTEMPTS,
    OTHER_VALID_CODE,
    VALID_CODE,
} from "../fixtures";

type RoomCodeModule = typeof import("@/mocks/roomCode.mock");

let mod: RoomCodeModule;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
    // Contador e bloqueio são variáveis globais do módulo: cada teste começa com uma cópia nova
    vi.resetModules();
    mod = await import("@/mocks/roomCode.mock");
});

afterEach(() => {
    vi.useRealTimers();
});

async function failTimes(times: number) {
    for (let i = 0; i < times; i++) {
        await expect(mod.attemptEnterRoom(INVALID_CODE)).resolves.toBe(false);
    }
}

// O erro imita o do axios: error.response.status e o header retry-after em segundos
async function expectBlocked(code: string, retryAfterSeconds: number) {
    await expect(mod.attemptEnterRoom(code)).rejects.toMatchObject({
        message: "Too Many Requests",
        response: { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
    });
}

describe("[US04] roomCode (mock de ingresso e bloqueio)", () => {
    it("Deve usar 5 tentativas e 15 minutos como limites do bloqueio", () => {
        expect(mod.MAX_FAILED_ATTEMPTS).toBe(MAX_FAILED_ATTEMPTS);
        expect(mod.BLOCK_DURATION_SECONDS).toBe(BLOCK_SECONDS);
    });

    it.each([VALID_CODE, OTHER_VALID_CODE, "tec499", "  Sala1  "])(
        "Deve aceitar o código %s sem diferenciar maiúsculas e ignorando espaços",
        async (code) => {
            expect(mod.validateRoomCode(code)).toBe(true);
            await expect(mod.attemptEnterRoom(code)).resolves.toBe(true);
        },
    );

    it("Deve recusar com false um código que não existe", async () => {
        expect(mod.validateRoomCode(INVALID_CODE)).toBe(false);
        await expect(mod.attemptEnterRoom(INVALID_CODE)).resolves.toBe(false);
    });

    it("Deve não bloquear com 4 falhas seguidas", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS - 1);

        await expect(mod.attemptEnterRoom(VALID_CODE)).resolves.toBe(true);
    });

    it("Deve ativar o bloqueio na 5ª falha, que ainda responde false", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS);

        // A 5ª falha arma o bloqueio; quem recebe o 429 é a tentativa seguinte
        await expectBlocked(INVALID_CODE, BLOCK_SECONDS);
    });

    it("[QA] Deve lançar 429 até para um código VÁLIDO durante o bloqueio", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS);

        // Se o código certo passasse, o brute-force só precisaria insistir
        await expectBlocked(VALID_CODE, BLOCK_SECONDS);
    });

    it("[QA] Deve informar um retry-after decrescente durante o bloqueio", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS);

        await expectBlocked(VALID_CODE, 900);
        vi.advanceTimersByTime(60_000);
        await expectBlocked(VALID_CODE, 840);
        vi.advanceTimersByTime(839_000);
        // Faltam 1 s: arredonda para cima, nunca 0
        await expectBlocked(VALID_CODE, 1);
    });

    it("[QA] Deve não estender o bloqueio com tentativas feitas durante ele", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS);
        vi.advanceTimersByTime(10 * 60_000);

        // Se cada tentativa reiniciasse os 15 min, o retry-after voltaria a 900
        await expectBlocked(INVALID_CODE, 300);
    });

    it("Deve liberar e zerar o contador depois de 15 minutos", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS);

        vi.advanceTimersByTime(BLOCK_SECONDS * 1000);

        await expect(mod.attemptEnterRoom(VALID_CODE)).resolves.toBe(true);
        // Contador zerado: 4 falhas novas de novo não bloqueiam
        await failTimes(MAX_FAILED_ATTEMPTS - 1);
        await expect(mod.attemptEnterRoom(VALID_CODE)).resolves.toBe(true);
    });

    it("Deve continuar bloqueado 1 ms antes do fim dos 15 minutos", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS);

        vi.advanceTimersByTime(BLOCK_SECONDS * 1000 - 1);

        await expectBlocked(VALID_CODE, 1);
    });

    it("[QA] Deve zerar a contagem depois de um código válido, pois o PRD fala em falhas SEGUIDAS", async () => {
        await failTimes(MAX_FAILED_ATTEMPTS - 1);
        await expect(mod.attemptEnterRoom(VALID_CODE)).resolves.toBe(true);

        // Só 1 falha seguida desde o acerto: não pode armar o bloqueio
        await failTimes(1);

        await expect(mod.attemptEnterRoom(VALID_CODE)).resolves.toBe(true);
    });
});