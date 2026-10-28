import { beforeEach, describe, expect, it, vi } from "vitest";
import { problemService } from "@/services/problemService";
import {
    BACKEND_FORBIDDEN_BODY,
    DISCIPLINE_ID,
    FORBIDDEN_MESSAGE,
    makeProblem,
    makeProblemDetails,
    PROBLEM_ID,
} from "../fixtures";

const CREATE_ROUTE = new RegExp(`/api/v1/disciplines/${DISCIPLINE_ID}/problems$`);
const PROBLEM_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}$`);
const INPUT = { title: "Problema 1", description: "Prototipação do PRD" };

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

describe("[US05] problemService", () => {
    it("fetchProblemDetails deve buscar com GET a rota do problema e devolver os detalhes", async () => {
        const details = makeProblemDetails();
        vi.mocked(fetch).mockResolvedValue(jsonResponse(details, 200));

        await expect(problemService.fetchProblemDetails(PROBLEM_ID)).resolves.toEqual(details);

        const { url, init } = singleFetchCall();
        expect(url).toMatch(PROBLEM_ROUTE);
        expect(init.method).toBe("GET");
    });

    it("fetchProblemDetails deve devolver null quando o backend não responde ok", async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Not found" }, 404));

        await expect(problemService.fetchProblemDetails(PROBLEM_ID)).resolves.toBeNull();
        singleFetchCall();
    });

    it("createProblem deve fazer POST de título e descrição na rota da disciplina e devolver o problema criado", async () => {
        const created = makeProblem({ ...INPUT });
        vi.mocked(fetch).mockResolvedValue(jsonResponse(created, 201));

        await expect(problemService.createProblem(DISCIPLINE_ID, INPUT)).resolves.toEqual(created);

        const { url, init } = singleFetchCall();
        expect(url).toMatch(CREATE_ROUTE);
        expect(init.method).toBe("POST");
        expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
        // O tutor vem do token, não do corpo
        expect(sentBody(init)).toEqual(INPUT);
    });

    it("updateProblem deve fazer PUT de título e descrição na rota do problema", async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(makeProblem({ ...INPUT }), 200));

        await expect(problemService.updateProblem(PROBLEM_ID, INPUT)).resolves.toBeUndefined();

        const { url, init } = singleFetchCall();
        expect(url).toMatch(PROBLEM_ROUTE);
        expect(init.method).toBe("PUT");
        expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
        expect(sentBody(init)).toEqual(INPUT);
    });

    it("deleteProblem deve fazer DELETE na rota do problema e resolver no 204", async () => {
        vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

        await expect(problemService.deleteProblem(PROBLEM_ID)).resolves.toBeUndefined();

        const { url, init } = singleFetchCall();
        expect(url).toMatch(PROBLEM_ROUTE);
        expect(init.method).toBe("DELETE");
    });

    // --- IDOR: o erro do backend precisa chegar à interface ---

    // Hoje o service lança Error("Falha ao ...") e descarta status e mensagem: estes testes falham até corrigir
    const manageActions = [
        ["criar", () => problemService.createProblem(DISCIPLINE_ID, INPUT)],
        ["editar", () => problemService.updateProblem(PROBLEM_ID, INPUT)],
        ["excluir", () => problemService.deleteProblem(PROBLEM_ID)],
    ] as const;

    it.each(manageActions)(
        "[QA] Deve rejeitar com { status: 403, message } em português ao %s sem ser o tutor da sala",
        async (_action, call) => {
            // O @PreAuthorize nega e o handler devolve JSON com mensagem genérica em inglês
            vi.mocked(fetch).mockResolvedValue(jsonResponse(BACKEND_FORBIDDEN_BODY, 403));

            await expect(call()).rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
            singleFetchCall();
        },
    );
});