import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/teacher-rooms/page";
import type { Room } from "@/types/room";
import {
    COPIED_TOAST,
    CREATE_FAILED_TOAST,
    CREATED_TOAST,
    DELETE_FAILED_TOAST,
    DELETED_TOAST,
    joinLinkOf,
    makeOtherRoom,
    makeRoom,
    NAME_AT_MAX,
    NAME_AT_MIN,
    NAME_LENGTH_MESSAGE,
    NAME_LENGTH_TEXT,
    NAME_TOO_LONG,
    NAME_TOO_SHORT,
    NEW_ROOM_NAME,
    OTHER_ROOM_ID,
    ROOM_ID,
    UPDATE_FAILED_TOAST,
    UPDATED_TOAST,
} from "../fixtures";

// O mock global do setup cria um push novo a cada chamada: aqui ele é um só, para o teste poder conferi-lo
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
    useParams: () => ({}),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));

const ROOMS_ROUTE = /\/api\/v1\/rooms(?:\/([^/?]+))?$/;

// Estado do fakeBackend: as salas do tutor, a próxima numeração de código e a rede
let rooms: Room[];
let nextCode: number;
let backendFails: boolean;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const method = init.method ?? "GET";
    const match = String(input).match(ROOMS_ROUTE);
    if (!match) return Promise.resolve(jsonResponse({}, 404));
    const roomId = match[1];

    const respond = (): Response => {
        if (method === "GET" && !roomId) return jsonResponse(rooms, 200);
        // Falha do servidor nas escritas: nada é gravado
        if (backendFails) return jsonResponse({ status: 500, message: "Internal Server Error" }, 500);

        if (method === "POST" && !roomId) {
            const { name } = JSON.parse(String(init.body)) as { name?: string };
            const trimmed = String(name ?? "").trim();
            // Mesma regra do critério de aceite: entre 3 e 100 caracteres
            if (trimmed.length < 3 || trimmed.length > 100) {
                return jsonResponse({ status: 400, message: NAME_LENGTH_TEXT }, 400);
            }
            // Código e link são gerados pelo servidor
            const code = `SALA${nextCode++}`;
            const joinLink = joinLinkOf(code);
            rooms = [...rooms, makeRoom({ id: `room-${code}`, name: trimmed, code, joinLink })];
            return jsonResponse({ code, joinLink }, 201);
        }
        if (method === "PUT" && roomId) {
            const { name } = JSON.parse(String(init.body)) as { name: string };
            rooms = rooms.map((room) => (room.id === roomId ? { ...room, name: name.trim() } : room));
            return jsonResponse(rooms.find((room) => room.id === roomId), 200);
        }
        if (method === "DELETE" && roomId) {
            rooms = rooms.filter((room) => room.id !== roomId);
            return new Response(null, { status: 204 });
        }
        return jsonResponse({}, 404);
    };

    // Rede lenta: a resposta só sai quando o teste libera
    return networkIsSlow
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

function cardOf(name: string) {
    const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
    if (!item) throw new Error(`card da sala ${name} não encontrado`);
    return within(item);
}

async function renderPage() {
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText(makeRoom().name);
    return { user };
}

// Colar em vez de digitar: 100 e 101 eventos de tecla deixariam o teste lento sem testar nada a mais
async function fillName(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, text: string) {
    await user.clear(input);
    await user.click(input);
    await user.paste(text);
}

async function openCreateModal(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /criar nova sala/i }));
    const dialog = within(await screen.findByRole("dialog"));
    return { dialog, nameInput: dialog.getByLabelText(/título/i) };
}

async function createThroughModal(user: ReturnType<typeof userEvent.setup>, name: string) {
    const { dialog, nameInput } = await openCreateModal(user);
    await fillName(user, nameInput, name);
    await user.click(dialog.getByRole("button", { name: /^criar$/i }));
}

async function editThroughModal(user: ReturnType<typeof userEvent.setup>, roomName: string, newName: string) {
    await user.click(cardOf(roomName).getByRole("button", { name: /editar/i }));
    const dialog = within(await screen.findByRole("dialog"));
    await fillName(user, dialog.getByLabelText(/título/i), newName);
    await user.click(dialog.getByRole("button", { name: /salvar/i }));
}

beforeEach(() => {
    rooms = [makeRoom(), makeOtherRoom()];
    nextCode = 3;
    backendFails = false;
    networkIsSlow = false;
    heldResponses = [];
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US03] Integração da página de salas do tutor", () => {
    // --- LISTAGEM ---

    it("Deve sinalizar o carregamento, buscar com GET as salas e listar nome, código e semestre de cada uma", async () => {
        networkIsSlow = true;
        render(<Home />);

        // Antes da resposta: carregando, sem lista
        expect(screen.getByText(/carregando salas/i)).toBeInTheDocument();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
        const gets = requestsWithMethod("GET");
        expect(gets).toHaveLength(1);
        expect(gets[0].url).toMatch(/\/api\/v1\/rooms$/);

        await releaseHeldResponses();

        const items = await screen.findAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(within(items[0]).getByText("Circuitos Digitais")).toBeInTheDocument();
        expect(within(items[0]).getByText("TEC498")).toBeInTheDocument();
        expect(within(items[0]).getByText(/semestre: 2026\.2/i)).toBeInTheDocument();
        expect(within(items[1]).getByText("TEC499")).toBeInTheDocument();
        expect(screen.queryByText(/carregando salas/i)).not.toBeInTheDocument();
    });

    // --- CRIAÇÃO ---

    it("Deve fazer POST do nome sem os espaços das pontas, fechar o modal e listar a sala com o código gerado pelo servidor", async () => {
        const { user } = await renderPage();

        await createThroughModal(user, `  ${NEW_ROOM_NAME}  `);

        expect(await screen.findByText(CREATED_TOAST)).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        const posts = requestsWithMethod("POST");
        expect(posts).toHaveLength(1);
        expect(posts[0].url).toMatch(/\/api\/v1\/rooms$/);
        expect(posts[0].body).toEqual({ name: NEW_ROOM_NAME });
        // O código "SALA3" não está na requisição: só pode ter vindo da resposta do servidor
        expect(cardOf(NEW_ROOM_NAME).getByText("SALA3")).toBeInTheDocument();
        expect(rooms).toHaveLength(3);
        // Depois de criar, a lista é buscada de novo para refletir o que o servidor gravou
        await waitFor(() => expect(requestsWithMethod("GET")).toHaveLength(2));
    });

    it.each([
        { label: "vazio", name: "" },
        { label: "só com espaços", name: "     " },
        { label: "com 2 caracteres", name: NAME_TOO_SHORT },
        { label: "com 101 caracteres", name: NAME_TOO_LONG },
    ])("[QA] Deve bloquear a criação com o nome $label, exibindo o alerta no modal e sem chamar o backend", async ({ name }) => {
        const { user } = await renderPage();
        const { dialog, nameInput } = await openCreateModal(user);

        if (name) await fillName(user, nameInput, name);
        await user.click(dialog.getByRole("button", { name: /^criar$/i }));

        expect(await dialog.findByRole("alert")).toHaveTextContent(NAME_LENGTH_MESSAGE);
        // O modal continua aberto para o tutor corrigir, e nada saiu do front
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(requestsWithMethod("POST")).toHaveLength(0);
        expect(rooms).toHaveLength(2);
    });

    it.each([
        { label: "3", name: NAME_AT_MIN },
        { label: "100", name: NAME_AT_MAX },
    ])("[QA] Deve aceitar e gravar o nome com exatamente $label caracteres, limites da faixa de 3 a 100", async ({ name }) => {
        const { user } = await renderPage();

        await createThroughModal(user, name);

        expect(await screen.findByText(CREATED_TOAST)).toBeInTheDocument();
        expect(requestsWithMethod("POST")[0].body).toEqual({ name });
        // Gravado inteiro, sem corte silencioso em nenhuma camada
        expect(rooms[2].name).toBe(name);
    });

    it("[QA] Deve travar o modal enquanto a criação está pendente, gravando uma única sala mesmo com clique duplo", async () => {
        const { user } = await renderPage();
        const { dialog, nameInput } = await openCreateModal(user);
        await fillName(user, nameInput, NEW_ROOM_NAME);
        networkIsSlow = true;

        await user.click(dialog.getByRole("button", { name: /^criar$/i }));
        // O segundo clique cai com a requisição ainda pendente
        await user.click(dialog.getByRole("button", { name: /criando/i }));

        expect(dialog.getByRole("button", { name: /criando/i })).toBeDisabled();
        expect(requestsWithMethod("POST")).toHaveLength(1);
        expect(rooms).toHaveLength(2);
        // Sem resposta do servidor, nada é confirmado
        expect(screen.queryByText(CREATED_TOAST)).not.toBeInTheDocument();

        networkIsSlow = false;
        await releaseHeldResponses();

        expect(await screen.findByText(CREATED_TOAST)).toBeInTheDocument();
        expect(rooms).toHaveLength(3);
    });

    it("[QA] Deve avisar a falha e não listar a sala quando o servidor recusa a criação com 500", async () => {
        backendFails = true;
        const { user } = await renderPage();

        await createThroughModal(user, NEW_ROOM_NAME);

        // O service ignora response.ok: hoje a tela anuncia sucesso e exibe uma sala que não existe
        expect(await screen.findByText(CREATE_FAILED_TOAST)).toBeInTheDocument();
        expect(screen.queryByText(CREATED_TOAST)).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText(NEW_ROOM_NAME)).not.toBeInTheDocument());
        expect(rooms).toHaveLength(2);
    });

    // --- EDIÇÃO ---

    it("Deve fazer PUT do novo nome na rota da sala e exibir o nome gravado pelo servidor", async () => {
        const { user } = await renderPage();

        await editThroughModal(user, "Circuitos Digitais", `  ${NEW_ROOM_NAME}  `);

        expect(await screen.findByText(UPDATED_TOAST)).toBeInTheDocument();
        const puts = requestsWithMethod("PUT");
        expect(puts).toHaveLength(1);
        expect(puts[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}$`));
        expect(puts[0].body).toEqual({ name: NEW_ROOM_NAME });
        expect(cardOf(NEW_ROOM_NAME).getByText("TEC498")).toBeInTheDocument();
        expect(screen.queryByText("Circuitos Digitais")).not.toBeInTheDocument();
        expect(rooms[0].name).toBe(NEW_ROOM_NAME);
    });

    it("[QA] Deve bloquear a edição com nome abaixo de 3 caracteres, mantendo o modal aberto e sem chamar o backend", async () => {
        const { user } = await renderPage();

        await editThroughModal(user, "Circuitos Digitais", NAME_TOO_SHORT);

        expect(await screen.findByRole("alert")).toHaveTextContent(NAME_LENGTH_MESSAGE);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(requestsWithMethod("PUT")).toHaveLength(0);
        expect(rooms[0].name).toBe("Circuitos Digitais");
    });

    it("[QA] Deve avisar a falha e manter o nome antigo quando o servidor recusa a edição com 500", async () => {
        backendFails = true;
        const { user } = await renderPage();

        await editThroughModal(user, "Circuitos Digitais", NEW_ROOM_NAME);

        // O service ignora response.ok: hoje a tela anuncia "atualizada" mesmo sem o servidor gravar
        expect(await screen.findByText(UPDATE_FAILED_TOAST)).toBeInTheDocument();
        expect(screen.queryByText(UPDATED_TOAST)).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText(NEW_ROOM_NAME)).not.toBeInTheDocument());
        expect(cardOf("Circuitos Digitais")).toBeDefined();
    });

    // --- EXCLUSÃO ---

    it("Deve pedir confirmação antes de excluir e não chamar o backend quando o tutor cancela", async () => {
        const { user } = await renderPage();

        await user.click(cardOf("Circuitos Digitais").getByRole("button", { name: /excluir/i }));
        const confirmation = within(await screen.findByRole("alertdialog"));
        expect(confirmation.getByText("Circuitos Digitais")).toBeInTheDocument();

        await user.click(confirmation.getByRole("button", { name: /cancelar/i }));

        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(requestsWithMethod("DELETE")).toHaveLength(0);
        expect(cardOf("Circuitos Digitais")).toBeDefined();
        expect(rooms).toHaveLength(2);
    });

    it("Deve fazer DELETE na rota da sala depois da confirmação e remover só essa sala da lista", async () => {
        const { user } = await renderPage();

        await user.click(cardOf("Circuitos Digitais").getByRole("button", { name: /excluir/i }));
        // O nome "Excluir" também é o do botão do card: o botão de confirmar é o do alertdialog
        await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Excluir" }));

        expect(await screen.findByText(DELETED_TOAST)).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        const deletes = requestsWithMethod("DELETE");
        expect(deletes).toHaveLength(1);
        expect(deletes[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}$`));
        expect(screen.queryByText("Circuitos Digitais")).not.toBeInTheDocument();
        expect(cardOf("Sistemas Digitais")).toBeDefined();
        expect(rooms.map((room) => room.id)).toEqual([OTHER_ROOM_ID]);
    });

    it("[QA] Deve avisar a falha e manter a sala na lista quando o servidor recusa a exclusão com 500", async () => {
        backendFails = true;
        const { user } = await renderPage();

        await user.click(cardOf("Circuitos Digitais").getByRole("button", { name: /excluir/i }));
        await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Excluir" }));

        // O service ignora response.ok: hoje a tela anuncia "deletada" mesmo sem o servidor excluir
        expect(await screen.findByText(DELETE_FAILED_TOAST)).toBeInTheDocument();
        expect(screen.queryByText(DELETED_TOAST)).not.toBeInTheDocument();
        expect(cardOf("Circuitos Digitais")).toBeDefined();
        expect(rooms).toHaveLength(2);
    });

    // --- COPIAR LINK E ENTRAR ---

    it("Deve copiar o link de convite app/join/{codigo} e confirmar com o toast, sem entrar na sala", async () => {
        // O userEvent.setup() instala o clipboard falso do qual o teste lê o que foi copiado
        const { user } = await renderPage();

        await user.click(cardOf("Sistemas Digitais").getByRole("button", { name: /copiar link/i }));

        expect(await screen.findByText(COPIED_TOAST)).toBeInTheDocument();
        await expect(navigator.clipboard.readText()).resolves.toBe(`${window.location.origin}/${joinLinkOf("TEC499")}`);
        // O clique no botão não pode vazar para o card (stopPropagation)
        expect(push).not.toHaveBeenCalled();
    });

    it("Deve entrar na sala pelo clique no card, navegando para as disciplinas da sala", async () => {
        const { user } = await renderPage();

        await user.click(cardOf("Sistemas Digitais").getByText("Sistemas Digitais"));

        expect(push).toHaveBeenCalledTimes(1);
        expect(push).toHaveBeenCalledWith(`/teacher-rooms/${OTHER_ROOM_ID}/disciplines`);
    });
});
