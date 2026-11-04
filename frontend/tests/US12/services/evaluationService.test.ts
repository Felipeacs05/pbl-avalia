import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluationService } from "@/services/evaluationService";
import {
    makeEvaluationStatus,
    makeReleasedStatus,
    PROBLEM_ID,
    SERVER_ERROR_MESSAGE,
    SERVER_ERROR_TEXT,
} from "../fixtures";

const STATUS_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/evaluation-status$`);
const RELEASE_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/evaluations/release$`);

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function singleFetchCall() {
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    return { url: String(url), init: init ?? {} };
}

function sentBody(init: RequestInit): unknown {
    return JSON.parse(String(init.body));
}

beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
});

describe("[US12] evaluationService", () => {
    it("Deve buscar com GET o status de liberação do problema e devolvê-lo como o backend enviou", async () => {
        const status = makeReleasedStatus("self_evaluation");
        vi.mocked(fetch).mockResolvedValue(jsonResponse(status, 200));

        await expect(evaluationService.getEvaluationStatus(PROBLEM_ID)).resolves.toEqual(status);

        const { url, init } = singleFetchCall();
        expect(url).toMatch(STATUS_ROUTE);
        expect(init.method ?? "GET").toBe("GET");
        expect(init.body).toBeUndefined();
    });

    it("Deve fazer POST do tipo liberado na rota de liberação e devolver o status do servidor", async () => {
        const status = makeReleasedStatus("self_evaluation");
        vi.mocked(fetch).mockResolvedValue(jsonResponse(status, 200));

        await expect(evaluationService.releaseEvaluation(PROBLEM_ID, "self_evaluation")).resolves.toEqual(status);

        const { url, init } = singleFetchCall();
        expect(url).toMatch(RELEASE_ROUTE);
        expect(init.method).toBe("POST");
        expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
        // A identidade do tutor vem do token, não do corpo
        expect(sentBody(init)).toEqual({ type: "self_evaluation" });
    });

    it("Deve enviar type null para desativar a liberação", async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(makeEvaluationStatus(), 200));

        await expect(evaluationService.releaseEvaluation(PROBLEM_ID, null)).resolves.toEqual(makeEvaluationStatus());

        expect(sentBody(singleFetchCall().init)).toEqual({ type: null });
    });

    it("[QA] Deve rejeitar com o status e a mensagem do backend quando a liberação falha com 500", async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: SERVER_ERROR_TEXT }, 500));

        // O plano pede manter o estado e informar o erro: cair num mock esconderia a falha do tutor
        await expect(evaluationService.releaseEvaluation(PROBLEM_ID, "self_evaluation")).rejects.toEqual({
            status: 500,
            message: expect.stringMatching(SERVER_ERROR_MESSAGE),
        });
        singleFetchCall();
    });

    it("[QA] Deve rejeitar com status 0 quando a rede falha na liberação", async () => {
        vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(evaluationService.releaseEvaluation(PROBLEM_ID, "self_evaluation")).rejects.toMatchObject({
            status: 0,
        });
    });

    it("[QA] Deve rejeitar quando o backend recusa a leitura do status com 403", async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Forbidden" }, 403));

        // Devolver um status inventado faria o aluno ver uma liberação que não existe
        await expect(evaluationService.getEvaluationStatus(PROBLEM_ID)).rejects.toMatchObject({ status: 403 });
        singleFetchCall();
    });
});