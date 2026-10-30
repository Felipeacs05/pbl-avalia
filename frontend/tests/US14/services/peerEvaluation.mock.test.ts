import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluationMock } from "@/mocks/evaluationMock";
import { peerEvaluationMock, PEER_EVALUATION_MOCK_PROBLEM_ID } from "@/mocks/peerEvaluation.mock";
import { CLOSED_PROBLEM_ID, makeSubmission, OPEN_PROBLEM_ID, SELF_ONLY_PROBLEM_ID } from "../fixtures";

// Atraso simulado do POST
const FAKE_DELAY_MS = 600;

let logSpy: ReturnType<typeof vi.spyOn>;

// Roda o submit até o fim com o relógio falso e devolve o desfecho, sem rejeição solta
async function settle(problemId: string) {
    const outcome = peerEvaluationMock.submit(problemId, makeSubmission()).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
    );
    await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS);
    return outcome;
}

beforeEach(() => {
    vi.useFakeTimers();
    // O estado de liberação é global ao módulo: cada teste parte do estado inicial
    evaluationMock.reset();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("[US14] peerEvaluationMock", () => {
    it("Deve usar o problema prob_3, o único com a avaliação entre pares liberada de início", () => {
        expect(PEER_EVALUATION_MOCK_PROBLEM_ID).toBe(OPEN_PROBLEM_ID);
    });

    it("Deve considerar aberta só a avaliação do problema liberado para pares", () => {
        expect(peerEvaluationMock.isOpen(OPEN_PROBLEM_ID)).toBe(true);
        expect(peerEvaluationMock.isOpen(SELF_ONLY_PROBLEM_ID)).toBe(false);
        expect(peerEvaluationMock.isOpen(CLOSED_PROBLEM_ID)).toBe(false);
        // Problema sem registro de liberação nasce fechado
        expect(peerEvaluationMock.isOpen("prob_inexistente")).toBe(false);
    });

    it("Deve aceitar o envio quando a avaliação entre pares está liberada", async () => {
        const result = await settle(OPEN_PROBLEM_ID);

        expect(result).toEqual({ ok: true });
    });

    // Em prob_1 só a autoavaliação está liberada; em prob_2 nada
    it.each([
        ["só a autoavaliação liberada", SELF_ONLY_PROBLEM_ID],
        ["nada liberado", CLOSED_PROBLEM_ID],
    ])("[QA] Deve rejeitar o envio com 403 quando o problema tem %s", async (_case, problemId) => {
        const result = await settle(problemId);

        // Mesmo formato do axios (error.response.status), o que o modal lê
        expect(result).toMatchObject({ ok: false, error: { response: { status: 403 } } });
        // Recusado, nada é registrado
        expect(logSpy).not.toHaveBeenCalled();
    });

    it("[QA] Deve rejeitar com 403 quando o tutor desativa a liberação depois de aberta", async () => {
        evaluationMock.saveStatus(OPEN_PROBLEM_ID, null);

        const result = await settle(OPEN_PROBLEM_ID);

        expect(result).toMatchObject({ ok: false, error: { response: { status: 403 } } });
    });

    it("[QA] Deve rejeitar com 403 quando o tutor troca a liberação de pares pela de autoavaliação", async () => {
        evaluationMock.saveStatus(OPEN_PROBLEM_ID, "self_evaluation");

        const result = await settle(OPEN_PROBLEM_ID);

        // A chave da autoavaliação não libera o envio entre pares
        expect(result).toMatchObject({ ok: false, error: { response: { status: 403 } } });
    });

    it("Deve aceitar o envio de um problema que o tutor passa a liberar para pares", async () => {
        evaluationMock.saveStatus(CLOSED_PROBLEM_ID, "peer_evaluation");

        const result = await settle(CLOSED_PROBLEM_ID);

        expect(result).toEqual({ ok: true });
    });
});