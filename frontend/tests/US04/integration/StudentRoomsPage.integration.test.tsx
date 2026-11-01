import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentPage from "@/app/student-rooms/page";
import type { Room } from "@/types/room";
import {
    BLOCKED_MESSAGE,
    BLOCKED_TITLE,
    INVALID_CODE,
    LINK_CODE,
    makeOtherRoom,
    makeRoom,
    MAX_FAILED_ATTEMPTS,
    ROOM_ID,
    USER_EMAIL,
    USER_NAME,
    VALID_CODE,
    WRONG_CODE_TITLE,
} from "../fixtures";

// Navegação e query string controladas aqui; o mock global de vitest.setup.ts não expõe o push
const nav = vi.hoisted(() => ({
    push: vi.fn(),
    search: "",
    attempt: undefined as undefined | ((code: string) => Promise<boolean>),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
    useSearchParams: () => new URLSearchParams(nav.search),
}));

// O estado do bloqueio é global no módulo real: cada teste recebe uma cópia nova dele
vi.mock("@/mocks/roomCode.mock", () => ({
    attemptEnterRoom: (code: string) => nav.attempt!(code),
}));

let rooms: Room[];

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

// Só a listagem de salas passa pelo backend; o ingresso ainda é simulado no front
async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    if ((init.method ?? "GET") === "GET" && /\/api\/v1\/rooms$/.test(String(input))) {
        return jsonResponse(rooms, 200);
    }
    return jsonResponse({}, 404);
}

type User = ReturnType<typeof userEvent.setup>;

const codeInput = () => screen.getByPlaceholderText(/código da sala/i);
const confirmButton = () => screen.getByRole("button", { name: /entrar em sala pbl/i });

async function openModal(user: User) {
    await user.click(screen.getByRole("button", { name: /^entrar em sala$/i }));
}

async function submitCode(user: User, code: string) {
    await user.type(codeInput(), code);
    await user.click(confirmButton());
}

// Uma tentativa errada completa; a primeira abre o modal, as seguintes usam "Tentar de novo"
async function failOnce(user: User, firstAttempt: boolean) {
    if (firstAttempt) await openModal(user);
    else await user.click(screen.getByRole("button", { name: /tentar de novo/i }));
    await submitCode(user, INVALID_CODE);
    await screen.findByRole("heading", { name: WRONG_CODE_TITLE });
}

async function failTimes(user: User, times: number) {
    for (let i = 0; i < times; i++) await failOnce(user, i === 0);
}

function renderPage() {
    const user = userEvent.setup();
    render(<StudentPage />);
    return { user };
}

beforeEach(async () => {
    rooms = [makeRoom(), makeOtherRoom()];
    nav.search = "";
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
    // A US não prevê alert: o spy garante que nenhum é disparado
    vi.spyOn(window, "alert").mockImplementation(() => {});

    vi.resetModules();
    const actual = await vi.importActual<typeof import("@/mocks/roomCode.mock")>("@/mocks/roomCode.mock");
    nav.attempt = actual.attemptEnterRoom;
});

describe("[US04] Integração da página de salas do aluno", () => {
    it("Deve listar as salas do backend com tutor e semestre e abrir a sala ao tocar no card", async () => {
        const { user } = renderPage();

        expect(await screen.findByText(makeRoom().name)).toBeInTheDocument();
        expect(screen.getByText(makeOtherRoom().name)).toBeInTheDocument();
        expect(screen.getByText(`Tutor : ${makeRoom().tutor}`)).toBeInTheDocument();

        await user.click(screen.getByText(makeRoom().name));

        expect(nav.push).toHaveBeenCalledWith(`/student-rooms/${ROOM_ID}`);
    });

    it("Deve manter o modal fechado até o aluno tocar em Entrar em sala", async () => {
        const { user } = renderPage();

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await openModal(user);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(USER_NAME)).toBeInTheDocument();
        expect(screen.getByText(USER_EMAIL)).toBeInTheDocument();
        expect(codeInput()).toHaveValue("");
    });

    it("Deve abrir o modal já preenchido quando o link traz ?codigo=", () => {
        nav.search = `codigo=${LINK_CODE}`;
        renderPage();

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(codeInput()).toHaveValue(LINK_CODE);
    });

    it("Deve entrar pelo link de convite sem digitar o código", async () => {
        nav.search = `codigo=${VALID_CODE}`;
        const { user } = renderPage();

        await user.click(confirmButton());

        expect(nav.push).toHaveBeenCalledWith("/student-rooms/1");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Deve entrar na sala com o código correto digitado em minúsculas, fechando o modal", async () => {
        const { user } = renderPage();

        await openModal(user);
        await submitCode(user, VALID_CODE.toLowerCase());

        expect(nav.push).toHaveBeenCalledTimes(1);
        expect(nav.push).toHaveBeenCalledWith("/student-rooms/1");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: WRONG_CODE_TITLE })).not.toBeInTheDocument();
        expect(window.alert).not.toHaveBeenCalled();
    });

    it("Deve exibir o pop-up Código errado com o código digitado em maiúsculas", async () => {
        const { user } = renderPage();

        await openModal(user);
        await submitCode(user, INVALID_CODE.toLowerCase());

        expect(await screen.findByRole("heading", { name: WRONG_CODE_TITLE })).toBeInTheDocument();
        // O aluno confere o que enviou: o código aparece entre aspas, já normalizado
        expect(screen.getByText(`“${INVALID_CODE}”`)).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(nav.push).not.toHaveBeenCalled();
    });

    it("Deve reabrir o modal vazio ao tocar em Tentar de novo", async () => {
        const { user } = renderPage();
        await failTimes(user, 1);

        await user.click(screen.getByRole("button", { name: /tentar de novo/i }));

        expect(screen.queryByRole("heading", { name: WRONG_CODE_TITLE })).not.toBeInTheDocument();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(codeInput()).toHaveValue("");
    });

    it("Deve fechar o pop-up de código errado ao tocar em Fechar, sem reabrir o modal", async () => {
        const { user } = renderPage();
        await failTimes(user, 1);

        await user.click(screen.getByRole("button", { name: "Fechar" }));

        expect(screen.queryByRole("heading", { name: WRONG_CODE_TITLE })).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Deve aceitar o código correto depois de 4 falhas seguidas", async () => {
        const { user } = renderPage();
        await failTimes(user, MAX_FAILED_ATTEMPTS - 1);

        await user.click(screen.getByRole("button", { name: /tentar de novo/i }));
        await submitCode(user, VALID_CODE);

        expect(screen.queryByRole("heading", { name: BLOCKED_TITLE })).not.toBeInTheDocument();
        expect(nav.push).toHaveBeenCalledWith("/student-rooms/1");
    });

    it(
        "Deve bloquear na tentativa seguinte à 5ª falha, com cerca de 15 min, Entendi e sem Tentar de novo",
        async () => {
            const { user } = renderPage();
            // A 5ª falha ainda mostra "Código errado" e arma o bloqueio
            await failTimes(user, MAX_FAILED_ATTEMPTS);

            await user.click(screen.getByRole("button", { name: /tentar de novo/i }));
            await submitCode(user, INVALID_CODE);

            expect(await screen.findByRole("heading", { name: BLOCKED_TITLE })).toBeInTheDocument();
            expect(screen.getByText(BLOCKED_MESSAGE)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Entendi" })).toBeInTheDocument();
            // Insistir não adianta: o botão de nova tentativa some
            expect(screen.queryByRole("button", { name: /tentar de novo/i })).not.toBeInTheDocument();
            expect(screen.queryByRole("heading", { name: WRONG_CODE_TITLE })).not.toBeInTheDocument();
        },
        20_000,
    );

    it(
        "Deve fechar o aviso de bloqueio ao tocar em Entendi",
        async () => {
            const { user } = renderPage();
            await failTimes(user, MAX_FAILED_ATTEMPTS);
            await user.click(screen.getByRole("button", { name: /tentar de novo/i }));
            await submitCode(user, INVALID_CODE);
            await screen.findByRole("heading", { name: BLOCKED_TITLE });

            await user.click(screen.getByRole("button", { name: "Entendi" }));

            expect(screen.queryByRole("heading", { name: BLOCKED_TITLE })).not.toBeInTheDocument();
        },
        20_000,
    );

    it(
        "[QA] Deve continuar bloqueado quando o código VÁLIDO é enviado depois de 5 falhas",
        async () => {
            const { user } = renderPage();
            await failTimes(user, MAX_FAILED_ATTEMPTS);

            await user.click(screen.getByRole("button", { name: /tentar de novo/i }));
            await submitCode(user, VALID_CODE);

            // O código certo durante o bloqueio não pode vincular o aluno à sala
            expect(await screen.findByRole("heading", { name: BLOCKED_TITLE })).toBeInTheDocument();
            expect(screen.getByText(BLOCKED_MESSAGE)).toBeInTheDocument();
            expect(nav.push).not.toHaveBeenCalled();
        },
        20_000,
    );
});