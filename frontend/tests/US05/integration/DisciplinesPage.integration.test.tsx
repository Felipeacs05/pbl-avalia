import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisciplinesPage from "@/app/teacher-rooms/[id]/disciplines/page";
import { gradeMock } from "@/mocks/grade.mock";
import type { Room } from "@/types/room";
import {
    ACTION_FAILURE_MESSAGE,
    BACKEND_FORBIDDEN_BODY,
    CREATE_FAILURE_MESSAGE,
    DISCIPLINE_ID,
    makeGradeMock,
    makeOtherProblem,
    makeProblem,
    makeRoom,
    NEW_PROBLEM_ID,
    OTHER_PROBLEM_ID,
    PROBLEM_ID,
    ROOM_ID,
    TITLE_REQUIRED_MESSAGE,
} from "../fixtures";

// O setup global devolve useParams() vazio; aqui a página precisa da sala e de um push observável
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
    useParams: () => ({ id: "987e6543-e21b-12d3-a456-426614174000" }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
}));

// Mesmo "banco" falso dos testes do hook: a listagem da página lê daqui, e o fakeBackend escreve aqui
vi.mock("@/mocks/grade.mock", async () => {
    const { makeGradeMock } = await import("../fixtures");
    return { gradeMock: makeGradeMock() };
});

const DISCIPLINE_PROBLEMS_ROUTE = /\/api\/v1\/disciplines\/([^/]+)\/problems$/;
const PROBLEM_ROUTE = /\/api\/v1\/problems\/([^/]+)$/;
const PRESET_PATH = `/teacher-rooms/${ROOM_ID}/problems/${NEW_PROBLEM_ID}/preset`;

// Estado do fakeBackend
let rooms: Room[];
let requesterIsRoomTutor: boolean;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = String(input);
    const method = init.method ?? "GET";

    if (method === "GET" && /\/api\/v1\/rooms$/.test(url)) {
        return Promise.resolve(jsonResponse(rooms, 200));
    }

    const respond = () => {
        // Mesma regra do backend: só o Tutor da sala cria, edita ou exclui (403 com JSON genérico)
        if (!requesterIsRoomTutor) {
            return jsonResponse(BACKEND_FORBIDDEN_BODY, 403);
        }
        const disciplineId = url.match(DISCIPLINE_PROBLEMS_ROUTE)?.[1];
        if (method === "POST" && disciplineId) {
            const body = JSON.parse(String(init.body)) as { title: string; description: string };
            const created = { id: NEW_PROBLEM_ID, ...body };
            // O backend gravou: a listagem (lida do banco falso) passa a enxergar o problema no fim
            gradeMock.find((d) => d.id === disciplineId)?.problems.push(created);
            return jsonResponse(created, 201);
        }
        const problemId = url.match(PROBLEM_ROUTE)?.[1];
        if (method === "DELETE" && problemId) {
            gradeMock.forEach((d) => {
                d.problems = d.problems.filter((p) => p.id !== problemId);
            });
            return new Response(null, { status: 204 });
        }
        return jsonResponse({}, 404);
    };

    // Rede lenta só nas escritas: a resposta sai quando o teste libera
    return networkIsSlow && method !== "GET"
        ? new Promise((resolve) => heldResponses.push(() => resolve(respond())))
        : Promise.resolve(respond());
}

function requestsWithMethod(method: string) {
    return vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
        .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

async function releaseHeldResponses() {
    await act(async () => {
        heldResponses.splice(0).forEach((release) => release());
    });
}

function problemTitles() {
    return screen.queryAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
}

// O card é o pai do título: os botões de ícone moram dentro dele
function cardOf(title: string) {
    return within(screen.getByRole("heading", { level: 3, name: title }).parentElement as HTMLElement);
}

async function renderPage() {
    const user = userEvent.setup();
    render(<DisciplinesPage />);
    // Sala vem do fetch e a disciplina vem do banco falso, com 400 ms de latência
    await screen.findByRole("heading", { level: 3, name: makeProblem().title }, { timeout: 3000 });
    return { user };
}

async function fillAndCreate(user: ReturnType<typeof userEvent.setup>, title: string, description: string) {
    await user.click(screen.getByRole("button", { name: /novo problema/i }));
    await user.type(screen.getByLabelText(/título/i), title);
    await user.type(screen.getByLabelText(/descrição/i), description);
    await user.click(screen.getByRole("button", { name: /^criar$/i }));
}

beforeEach(() => {
    gradeMock.splice(0, gradeMock.length, ...makeGradeMock());
    rooms = [makeRoom()];
    requesterIsRoomTutor = true;
    networkIsSlow = false;
    heldResponses = [];
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US05] Integração da página de disciplinas (CRUD de problemas)", () => {
    it("Deve listar os problemas da disciplina na ordem cronológica do banco", async () => {
        await renderPage();

        expect(problemTitles()).toEqual([makeProblem().title, makeOtherProblem().title]);
        expect(requestsWithMethod("GET")[0].url).toMatch(/\/api\/v1\/rooms$/);
    });

    it("[QA] Deve exibir os problemas como lista ordenada, para o tutor seguir o semestre em ordem cronológica", async () => {
        await renderPage();

        // Critério do PRD: ordenação visual clara; <ol> deixa a cronologia explícita (hoje os cards são <div>)
        const list = screen.getByRole("list");
        expect(list.tagName).toBe("OL");
        expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    });

    // --- NAVEGAÇÃO ---

    it("Deve abrir o problema ao tocar no card, mas não ao tocar no botão de excluir", async () => {
        const { user } = await renderPage();

        await user.click(cardOf(makeProblem().title).getByRole("button", { name: "Delete problem" }));
        expect(push).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
        await user.click(screen.getByRole("heading", { level: 3, name: makeProblem().title }));

        expect(push).toHaveBeenCalledTimes(1);
        expect(push).toHaveBeenCalledWith(`/teacher-rooms/${ROOM_ID}/problems/${PROBLEM_ID}`);
    });

    // --- CRIAÇÃO ---

    it("Deve criar o problema com POST na rota da disciplina e redirecionar ao pré-set de critérios", async () => {
        const { user } = await renderPage();

        await fillAndCreate(user, "  Problema 3  ", "Controlador de semáforo");

        await waitFor(() => expect(push).toHaveBeenCalledWith(PRESET_PATH));
        const posts = requestsWithMethod("POST");
        expect(posts).toHaveLength(1);
        expect(posts[0].url).toMatch(new RegExp(`/api/v1/disciplines/${DISCIPLINE_ID}/problems$`));
        // O backend recebe título e descrição já sem as pontas em branco
        expect(posts[0].body).toEqual({ title: "Problema 3", description: "Controlador de semáforo" });
        expect(push).toHaveBeenCalledTimes(1);
    });

    it("[QA] Deve bloquear o título vazio no modal sem chamar o backend nem navegar", async () => {
        const { user } = await renderPage();

        await user.click(screen.getByRole("button", { name: /novo problema/i }));
        await user.click(screen.getByRole("button", { name: /^criar$/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(TITLE_REQUIRED_MESSAGE);
        expect(requestsWithMethod("POST")).toHaveLength(0);
        expect(push).not.toHaveBeenCalled();
    });

    it("[QA] Deve manter o modal aberto, sem navegar nem listar o problema, quando o backend recusa a criação com 403", async () => {
        requesterIsRoomTutor = false;
        const { user } = await renderPage();

        await fillAndCreate(user, "Problema Invasor", "Tentativa de IDOR");

        expect(await screen.findByRole("alert")).toHaveTextContent(CREATE_FAILURE_MESSAGE);
        expect(screen.getByRole("dialog", { name: "Criar Problema" })).toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
        // A tentativa chegou ao backend, que recusou sem gravar
        expect(requestsWithMethod("POST")).toHaveLength(1);
        expect(problemTitles()).toEqual([makeProblem().title, makeOtherProblem().title]);
    });

    // --- EXCLUSÃO ---

    it("Deve pedir confirmação, excluir com DELETE, refazer a lista e avisar com toast", async () => {
        const { user } = await renderPage();

        await user.click(cardOf(makeProblem().title).getByRole("button", { name: "Delete problem" }));

        const dialog = screen.getByRole("alertdialog", { name: "Excluir problema" });
        expect(dialog).toHaveTextContent(makeProblem().title);
        expect(dialog).toHaveTextContent(/não pode ser desfeita/i);
        // Nada foi excluído antes da confirmação
        expect(requestsWithMethod("DELETE")).toHaveLength(0);

        await user.click(within(dialog).getByRole("button", { name: /^excluir$/i }));

        expect(await screen.findByText(/problema "problema 1" excluído\./i, {}, { timeout: 3000 })).toBeInTheDocument();
        const deletes = requestsWithMethod("DELETE");
        expect(deletes).toHaveLength(1);
        expect(deletes[0].url).toMatch(new RegExp(`/api/v1/problems/${PROBLEM_ID}$`));
        // A lista só muda por causa da busca refeita; o outro problema continua
        expect(problemTitles()).toEqual([makeOtherProblem().title]);
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("Deve manter o modal com spinner e a lista intacta até o backend responder o DELETE", async () => {
        networkIsSlow = true;
        const { user } = await renderPage();

        await user.click(cardOf(makeProblem().title).getByRole("button", { name: "Delete problem" }));
        const dialog = screen.getByRole("alertdialog");
        await user.click(within(dialog).getByRole("button", { name: /^excluir$/i }));

        expect(within(dialog).getByRole("button", { name: /^excluir$/i })).toBeDisabled();
        expect(dialog.querySelector(".animate-spin")).not.toBeNull();
        expect(problemTitles()).toEqual([makeProblem().title, makeOtherProblem().title]);
        expect(screen.queryByText(/excluído\./i)).not.toBeInTheDocument();

        await releaseHeldResponses();

        await waitFor(() => expect(problemTitles()).toEqual([makeOtherProblem().title]), { timeout: 3000 });
        expect(await screen.findByText(/problema "problema 1" excluído\./i)).toBeInTheDocument();
    });

    it("Deve fechar o modal sem excluir quando o tutor cancela", async () => {
        const { user } = await renderPage();

        await user.click(cardOf(makeOtherProblem().title).getByRole("button", { name: "Delete problem" }));
        await user.click(screen.getByRole("button", { name: /^cancelar$/i }));

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(requestsWithMethod("DELETE")).toHaveLength(0);
        expect(problemTitles()).toEqual([makeProblem().title, makeOtherProblem().title]);
        expect(screen.queryByText(/excluído\./i)).not.toBeInTheDocument();
    });

    it("[QA] Deve exibir o erro no modal, sem toast, e manter o problema quando o backend recusa a exclusão com 403", async () => {
        requesterIsRoomTutor = false;
        const { user } = await renderPage();

        await user.click(cardOf(makeOtherProblem().title).getByRole("button", { name: "Delete problem" }));
        const dialog = screen.getByRole("alertdialog");
        await user.click(within(dialog).getByRole("button", { name: /^excluir$/i }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(ACTION_FAILURE_MESSAGE);
        expect(requestsWithMethod("DELETE")[0].url).toMatch(new RegExp(`/api/v1/problems/${OTHER_PROBLEM_ID}$`));
        expect(problemTitles()).toEqual([makeProblem().title, makeOtherProblem().title]);
        expect(screen.queryByText(/excluído\./i)).not.toBeInTheDocument();
    });
});