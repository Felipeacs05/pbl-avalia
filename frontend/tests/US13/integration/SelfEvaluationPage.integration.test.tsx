import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelfEvaluationPage from "@/app/selfevaluation/page";
import { evaluationMock } from "@/mocks/evaluationMock";
import type { Group } from "@/types/group";
import {
    CLOSED_PROBLEM_ID,
    FORBIDDEN_MESSAGE,
    LOGGED_STUDENT_ID,
    LOGGED_STUDENT_NAME,
    makeGroup,
    makeOtherStudent,
    makeStudent,
    NOT_RELEASED_TEXT,
    OTHER_STUDENT_ID,
    PROBLEM_ID,
    ROOM_ID,
    STUDENT_ID,
    SUCCESS_TOAST_TEXT,
} from "../fixtures";

const STATUS_ROUTE = /\/api\/v1\/problems\/([^/]+)\/evaluation-status$/;
const MY_GROUP_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/groups/me$`);

// O envio da página ainda usa o selfEvaluationMock (sem endpoint), que lê o mesmo evaluationMock
// que o fakeBackend devolve no status: assim a tela e o envio enxergam a mesma liberação.
const SUBMIT_TIMEOUT = { timeout: 3000 }; // o mock espera 600 ms reais antes de responder

let group: Group;
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
    const problemId = url.match(STATUS_ROUTE)?.[1];

    if (method === "GET" && problemId) {
        const respond = () => jsonResponse(evaluationMock.getStatus(problemId), 200);
        // Rede lenta: o status só chega quando o teste libera
        return networkIsSlow
            ? new Promise((resolve) => heldResponses.push(() => resolve(respond())))
            : Promise.resolve(respond());
    }
    if (method === "GET" && MY_GROUP_ROUTE.test(url)) {
        return Promise.resolve(jsonResponse(group, 200));
    }
    return Promise.resolve(jsonResponse({}, 404));
}

function requestsWithMethod(method: string) {
    return vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
        .map(([url]) => String(url));
}

async function releaseHeldResponses() {
    await act(async () => {
        heldResponses.splice(0).forEach((release) => release());
    });
}

// O botão da página e o título do modal têm o mesmo nome: o botão é achado fora do dialog
const pageButton = () => screen.getByRole("button", { name: /^(autoavaliação|carregando\.\.\.)$/i });

async function renderPage() {
    const user = userEvent.setup();
    render(<SelfEvaluationPage />);
    return { user };
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => expect(pageButton()).toBeEnabled());
    await user.click(pageButton());
    const dialog = within(screen.getByRole("dialog"));
    // O grupo carrega em paralelo ao status: espera os colegas chegarem antes de usar o formulário
    await dialog.findByText("Colegas do grupo (2)");
    return dialog;
}

beforeEach(() => {
    evaluationMock.reset();
    // O aluno logado também é membro do grupo e precisa sair da lista de colegas
    group = makeGroup([
        makeStudent(),
        { id: LOGGED_STUDENT_ID, name: LOGGED_STUDENT_NAME },
        makeOtherStudent(),
    ]);
    networkIsSlow = false;
    heldResponses = [];
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
    vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("[US13] Integração da página de autoavaliação", () => {
    it("Deve habilitar o botão sem aviso quando o tutor liberou a autoavaliação", async () => {
        await renderPage();

        await waitFor(() => expect(pageButton()).toBeEnabled());
        expect(screen.queryByText(NOT_RELEASED_TEXT)).not.toBeInTheDocument();
        // O status e o grupo vêm do backend, na rota do problema e da sala do mock da tela
        expect(requestsWithMethod("GET").some((url) => STATUS_ROUTE.exec(url)?.[1] === PROBLEM_ID)).toBe(true);
        expect(requestsWithMethod("GET").some((url) => MY_GROUP_ROUTE.test(url))).toBe(true);
    });

    it.each([
        ["nada liberado", () => evaluationMock.saveStatus(PROBLEM_ID, null)],
        ["só a avaliação entre pares liberada", () => evaluationMock.saveStatus(PROBLEM_ID, "peer_evaluation")],
    ])("Deve desabilitar o botão e explicar o motivo quando %s", async (_case, release) => {
        release();
        await renderPage();

        expect(await screen.findByText(NOT_RELEASED_TEXT)).toBeInTheDocument();
        expect(pageButton()).toBeDisabled();
        expect(pageButton()).toHaveAccessibleName("Autoavaliação");
    });

    it("Deve manter o botão desabilitado em Carregando... sem afirmar que não foi liberada enquanto o status não chega", async () => {
        networkIsSlow = true;
        await renderPage();

        // Antes da resposta, "não liberada" seria uma informação falsa
        expect(pageButton()).toBeDisabled();
        expect(pageButton()).toHaveTextContent(/carregando/i);
        expect(screen.queryByText(NOT_RELEASED_TEXT)).not.toBeInTheDocument();

        await releaseHeldResponses();

        await waitFor(() => expect(pageButton()).toBeEnabled());
        expect(pageButton()).toHaveTextContent("Autoavaliação");
    });

    it("Deve usar o problema liberado do mock e manter bloqueado o problema sem liberação", () => {
        // Âncora dos ids fixos que a tela usa: se mudarem no mock, estes testes precisam ser revistos
        expect(evaluationMock.getStatus(PROBLEM_ID).activeType).toBe("self_evaluation");
        expect(evaluationMock.getStatus(CLOSED_PROBLEM_ID).activeType).toBeNull();
    });

    it("Deve listar só os colegas do grupo, sem o próprio aluno logado", async () => {
        const { user } = await renderPage();

        const dialog = await openForm(user);

        // 3 membros no grupo, 2 colegas na lista
        expect(dialog.getByRole("slider", { name: "Alice Souza" })).toBeInTheDocument();
        expect(dialog.getByRole("slider", { name: "Bruno Lima" })).toBeInTheDocument();
        expect(dialog.queryByRole("slider", { name: LOGGED_STUDENT_NAME })).not.toBeInTheDocument();
        expect(dialog.queryByText(LOGGED_STUDENT_NAME)).not.toBeInTheDocument();
    });

    it("Deve enviar notas e uma entrada por colega, mostrar o toast de sucesso e fechar o modal", async () => {
        const { user } = await renderPage();
        const dialog = await openForm(user);

        fireEvent.change(dialog.getByRole("slider", { name: "Participação" }), { target: { value: "8" } });
        fireEvent.change(dialog.getByRole("slider", { name: "Alice Souza" }), { target: { value: "6" } });
        await user.type(dialog.getByLabelText(/justificativa/i), "  Fui bem  ");
        await user.click(dialog.getByRole("button", { name: /enviar avaliação/i }));

        expect(await screen.findByText(SUCCESS_TOAST_TEXT, {}, SUBMIT_TIMEOUT)).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        // O que seria enviado: sem o aluno logado, com todos os colegas e a justificativa aparada
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining(PROBLEM_ID),
            {
                scores: { content: 0, participation: 8, behavior: 0 },
                justification: "Fui bem",
                peers: [
                    { studentId: STUDENT_ID, score: 6, comment: "" },
                    { studentId: OTHER_STUDENT_ID, score: 0, comment: "" },
                ],
            },
        );
    });

    it("[QA] Deve recusar o envio com a mensagem de 403 quando o tutor encerra a liberação com o formulário aberto", async () => {
        const { user } = await renderPage();
        const dialog = await openForm(user);

        // O tutor fecha a liberação depois de o aluno abrir o formulário
        evaluationMock.saveStatus(PROBLEM_ID, null);
        await user.click(dialog.getByRole("button", { name: /enviar avaliação/i }));

        expect(await screen.findByRole("alert", {}, SUBMIT_TIMEOUT)).toHaveTextContent(FORBIDDEN_MESSAGE);
        // Recusado: sem toast de sucesso, e o modal segue aberto com o que o aluno preencheu
        expect(screen.queryByText(SUCCESS_TOAST_TEXT)).not.toBeInTheDocument();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(console.log).not.toHaveBeenCalled();
    });
});