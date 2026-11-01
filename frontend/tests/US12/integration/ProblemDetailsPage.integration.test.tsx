import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProblemDetailsPage from "@/app/teacher-rooms/[id]/problems/[problemId]/page";
import type { EvaluationStatus } from "@/types/evaluation";
import {
    DISABLED_TOAST,
    makeEvaluationStatus,
    makeProblemDetails,
    makeReleasedStatus,
    makeRoom,
    OPEN_LABEL,
    PEER_RELEASED_TOAST,
    PROBLEM_ID,
    ROOM_ID,
    SELF_RELEASED_TOAST,
} from "../fixtures";

// Sobrescreve o mock global: a página precisa dos ids da rota (sem vi.fn, que o mockReset zeraria)
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {}, back: () => {} }),
    useParams: () => ({ id: "987e6543-e21b-12d3-a456-426614174000", problemId: "555e5555-e55b-55d5-a555-555555555555" }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));

const STATUS_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/evaluation-status$`);
const RELEASE_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/evaluations/release$`);
const PROBLEM_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}$`);

// Estado do fakeBackend: o que está gravado e se a gravação falha
let evaluationStatus: EvaluationStatus;
let releaseFails: boolean;

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = String(input);
    const method = init.method ?? "GET";

    if (method === "GET" && url.endsWith("/api/v1/rooms")) return jsonResponse([makeRoom()], 200);
    if (method === "GET" && STATUS_ROUTE.test(url)) return jsonResponse(evaluationStatus, 200);
    if (method === "GET" && PROBLEM_ROUTE.test(url)) return jsonResponse(makeProblemDetails(), 200);
    if (method === "POST" && RELEASE_ROUTE.test(url)) {
        if (releaseFails) return jsonResponse({ message: "Erro interno" }, 500);
        const { type } = JSON.parse(String(init.body)) as { type: EvaluationStatus["activeType"] };
        evaluationStatus = { problemId: PROBLEM_ID, activeType: type, isReleased: type !== null };
        return jsonResponse(evaluationStatus, 200);
    }
    return jsonResponse({}, 404);
}

function requestsWithMethod(method: string) {
    return vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
        .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

// A página renderiza os layouts mobile e desktop ao mesmo tempo (o jsdom não aplica o CSS): sempre há duas cópias
async function renderPage(initialButton: string) {
    const user = userEvent.setup();
    render(<ProblemDetailsPage />);
    await screen.findAllByRole("button", { name: initialButton });
    return { user };
}

type User = ReturnType<typeof userEvent.setup>;

async function openModalFrom(user: User, buttonName: string) {
    await user.click(screen.getAllByRole("button", { name: buttonName })[0]);
    await screen.findByRole("dialog", { name: /liberar avaliações/i });
}

async function confirmRelease(user: User) {
    await user.click(screen.getByRole("button", { name: "Liberar" }));
}

beforeEach(() => {
    evaluationStatus = makeEvaluationStatus();
    releaseFails = false;
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US12] Integração da página do problema (liberação de avaliações)", () => {
    it("Deve buscar o status do problema e oferecer \"Liberar Avaliações\" sem badge enquanto nada está liberado", async () => {
        await renderPage("Liberar Avaliações");

        expect(requestsWithMethod("GET").map((request) => request.url)).toEqual(
            expect.arrayContaining([expect.stringMatching(STATUS_ROUTE)]),
        );
        expect(screen.queryByText("Status da Avaliação")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Alterar" })).not.toBeInTheDocument();
    });

    it("Deve liberar a autoavaliação: POST do tipo, toast de sucesso, badge de status e botão \"Alterar\"", async () => {
        const { user } = await renderPage("Liberar Avaliações");

        await openModalFrom(user, "Liberar Avaliações");
        await user.click(screen.getByRole("switch", { name: "Autoavaliação" }));
        await confirmRelease(user);

        expect(await screen.findByText(SELF_RELEASED_TOAST)).toBeInTheDocument();
        const posts = requestsWithMethod("POST");
        expect(posts).toHaveLength(1);
        expect(posts[0].url).toMatch(RELEASE_ROUTE);
        expect(posts[0].body).toEqual({ type: "self_evaluation" });
        // O fakeBackend gravou: o que a tela mostra veio da resposta
        expect(evaluationStatus).toEqual(expect.objectContaining({ activeType: "self_evaluation", isReleased: true }));
        expect(screen.getAllByText("Status da Avaliação").length).toBeGreaterThan(0);
        expect(screen.getAllByRole("button", { name: "Autoavaliação Liberada" }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole("button", { name: "Alterar" }).length).toBeGreaterThan(0);
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("Deve liberar a avaliação entre pares com o toast próprio", async () => {
        const { user } = await renderPage("Liberar Avaliações");

        await openModalFrom(user, "Liberar Avaliações");
        await user.click(screen.getByRole("switch", { name: "Avaliação entre Pares" }));
        await confirmRelease(user);

        expect(await screen.findByText(PEER_RELEASED_TOAST)).toBeInTheDocument();
        expect(requestsWithMethod("POST")[0].body).toEqual({ type: "peer_evaluation" });
        expect(screen.getAllByRole("button", { name: "Avaliação entre Pares Liberada" }).length).toBeGreaterThan(0);
    });

    it("Deve desativar a liberação pelo \"Alterar\": POST null, toast de desativação e badge removida", async () => {
        evaluationStatus = makeReleasedStatus("self_evaluation");
        const { user } = await renderPage("Autoavaliação Liberada");
        expect(screen.getAllByText("Status da Avaliação").length).toBeGreaterThan(0);

        await openModalFrom(user, "Alterar");
        // O modal abre com a autoavaliação marcada: tocar de novo desmarca
        const toggle = screen.getByRole("switch", { name: "Autoavaliação" });
        expect(toggle).toHaveAttribute("aria-checked", "true");
        await user.click(toggle);
        await confirmRelease(user);

        expect(await screen.findByText(DISABLED_TOAST)).toBeInTheDocument();
        expect(requestsWithMethod("POST")[0].body).toEqual({ type: null });
        expect(evaluationStatus.isReleased).toBe(false);
        expect(screen.queryByText("Status da Avaliação")).not.toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Liberar Avaliações" }).length).toBeGreaterThan(0);
    });

    it("[QA] Deve exibir \"Avaliações Abertas\" depois de liberar a autoavaliação, como no CT-FE-US12-01", async () => {
        const { user } = await renderPage("Liberar Avaliações");

        await openModalFrom(user, "Liberar Avaliações");
        await user.click(screen.getByRole("switch", { name: "Autoavaliação" }));
        await confirmRelease(user);

        await screen.findByText(SELF_RELEASED_TOAST);
        // O plano fixa o texto do rótulo de status; a tela hoje mostra "Autoavaliação Liberada"
        expect(screen.getAllByText(OPEN_LABEL).length).toBeGreaterThan(0);
    });

    it("[QA] Não deve confirmar a liberação nem mostrar a badge quando a API responde 500, e deve informar o erro", async () => {
        releaseFails = true;
        const { user } = await renderPage("Liberar Avaliações");

        await openModalFrom(user, "Liberar Avaliações");
        await user.click(screen.getByRole("switch", { name: "Autoavaliação" }));
        await confirmRelease(user);

        await waitFor(() => expect(requestsWithMethod("POST")).toHaveLength(1));
        // Um sucesso falso faria o tutor achar que os alunos já podem se autoavaliar
        expect(screen.queryByText(SELF_RELEASED_TOAST)).not.toBeInTheDocument();
        expect(screen.queryByText("Status da Avaliação")).not.toBeInTheDocument();
        expect(evaluationStatus.isReleased).toBe(false);
        expect((await screen.findAllByText(/não foi possível|falha|erro/i)).length).toBeGreaterThan(0);
    });
});