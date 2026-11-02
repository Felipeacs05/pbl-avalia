import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PeerEvaluationPage from "@/app/peerevaluation/page";
import { evaluationMock } from "@/mocks/evaluationMock";
import { PEER_EVALUATION_MOCK_PEERS, peerEvaluationMock } from "@/mocks/peerEvaluation.mock";
import type { EvaluationType } from "@/types/evaluation";
import type { Group } from "@/types/group";
import {
    CLOSED_MESSAGE,
    LOGGED_STUDENT,
    makeGroup,
    NOT_RELEASED_HINT,
    OPEN_PROBLEM_ID,
    OTHER_PEER_ID,
    PEER_ID,
    SUCCESS_TOAST,
} from "../fixtures";

const STATUS_ROUTE = /\/api\/v1\/problems\/([^/]+)\/evaluation-status$/;
const MY_GROUP_ROUTE = /\/api\/v1\/rooms\/([^/]+)\/groups\/me$/;

type Scores = [number, number, number];

// Estado do fakeBackend: o que o tutor liberou e o grupo do aluno logado
let releasedType: EvaluationType;
let myGroup: Group;

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = String(input);
    if ((init.method ?? "GET") !== "GET") return jsonResponse({}, 404);

    const problemId = url.match(STATUS_ROUTE)?.[1];
    if (problemId) {
        return jsonResponse({ problemId, activeType: releasedType, isReleased: releasedType !== null }, 200);
    }
    if (MY_GROUP_ROUTE.test(url)) return jsonResponse(myGroup, 200);
    return jsonResponse({}, 404);
}

function getUrls() {
    return vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => (init?.method ?? "GET") === "GET")
        .map(([url]) => String(url));
}

function pageButton() {
    return screen.getByRole("button", { name: "Avaliação por pares" });
}

// Enquanto carrega o botão se chama "Carregando...": achar "Avaliação por pares" já prova que terminou
async function renderPage() {
    const user = userEvent.setup();
    render(<PeerEvaluationPage />);
    await waitFor(() => expect(pageButton()).toBeInTheDocument());
    return { user };
}

function cardOf(name: string): HTMLElement {
    const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
    if (!item) throw new Error(`card do colega ${name} não encontrado`);
    return item;
}

async function fillScores(user: ReturnType<typeof userEvent.setup>, name: string, scores: Scores) {
    const header = within(cardOf(name)).getByRole("button", { name: new RegExp(name) });
    if (header.getAttribute("aria-expanded") !== "true") await user.click(header);
    const card = within(cardOf(name));
    await user.type(card.getByLabelText(/conteúdo\/produto/i), String(scores[0]));
    await user.type(card.getByLabelText(/participação/i), String(scores[1]));
    await user.type(card.getByLabelText(/comportamento/i), String(scores[2]));
}

beforeEach(() => {
    evaluationMock.reset();
    releasedType = "peer_evaluation";
    // Grupo padrão = os 4 colegas do mock da tela: o fluxo vale com a lista fixa de hoje e com a do grupo
    myGroup = makeGroup([
        LOGGED_STUDENT,
        ...PEER_EVALUATION_MOCK_PEERS.map(({ id, name }) => ({ id, name })),
    ]);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US14] Integração da página de avaliação entre pares", () => {
    it.each<[string, EvaluationType]>([
        ["só a autoavaliação liberada", "self_evaluation"],
        ["nenhuma avaliação liberada", null],
    ])("Deve desabilitar o botão e explicar o motivo quando há %s", async (_case, type) => {
        releasedType = type;
        const { user } = await renderPage();

        expect(pageButton()).toBeDisabled();
        expect(screen.getByText(NOT_RELEASED_HINT)).toBeInTheDocument();

        await user.click(pageButton());

        // Botão desativado não abre o formulário: o aluno nem chega a preencher
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Deve consultar o status do problema, habilitar o botão e abrir o modal com os colegas quando liberado", async () => {
        const { user } = await renderPage();

        expect(getUrls().some((url) => new RegExp(`/api/v1/problems/${OPEN_PROBLEM_ID}/evaluation-status$`).test(url))).toBe(true);
        expect(pageButton()).toBeEnabled();
        expect(screen.queryByText(NOT_RELEASED_HINT)).not.toBeInTheDocument();

        await user.click(pageButton());

        const dialog = within(screen.getByRole("dialog", { name: /avaliação por pares/i }));
        expect(dialog.getByText("Colegas do grupo (4)")).toBeInTheDocument();
        PEER_EVALUATION_MOCK_PEERS.forEach((peer) => expect(dialog.getByText(peer.name)).toBeInTheDocument());
    });

    it("Deve enviar as avaliações dos 4 colegas, fechar o modal e confirmar com o toast", async () => {
        const submitSpy = vi.spyOn(peerEvaluationMock, "submit");
        const peers = PEER_EVALUATION_MOCK_PEERS;
        const scores: Scores[] = [
            [8, 9, 7],
            [6, 10, 5],
            [9, 9, 9],
            [7, 8, 10],
        ];
        const { user } = await renderPage();
        await user.click(pageButton());

        for (const [index, peer] of peers.entries()) await fillScores(user, peer.name, scores[index]);
        await user.click(screen.getByRole("button", { name: "Enviar Avaliações" }));

        // O mock tem 600 ms de atraso: a confirmação só aparece depois da resposta
        expect(await screen.findByText(SUCCESS_TOAST, {}, { timeout: 4000 })).toBeInTheDocument();
        expect(submitSpy).toHaveBeenCalledTimes(1);
        expect(submitSpy).toHaveBeenCalledWith(OPEN_PROBLEM_ID, {
            evaluations: peers.map((peer, index) => ({
                studentId: peer.id,
                scores: { content: scores[index][0], participation: scores[index][1], behavior: scores[index][2] },
                comment: "",
            })),
        });
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }, 20_000);

    it("[QA] Deve recusar com 403, sem toast de sucesso, quando o tutor encerra a avaliação durante o preenchimento", async () => {
        const submitSpy = vi.spyOn(peerEvaluationMock, "submit");
        const { user } = await renderPage();
        await user.click(pageButton());
        for (const peer of PEER_EVALUATION_MOCK_PEERS) await fillScores(user, peer.name, [8, 9, 7]);

        // O botão foi liberado quando a tela abriu; o tutor desliga a chave antes do envio
        evaluationMock.saveStatus(OPEN_PROBLEM_ID, null);
        await user.click(screen.getByRole("button", { name: "Enviar Avaliações" }));

        expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(CLOSED_MESSAGE);
        expect(screen.queryByText(SUCCESS_TOAST)).not.toBeInTheDocument();
        // A tentativa chegou ao envio, que recusou: o modal segue aberto para o aluno ver o motivo
        expect(submitSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    }, 20_000);

    // plano CT-BE-US14-01: o aluno só avalia colegas do próprio grupo, nunca a si mesmo
    it("[QA] Deve listar só os colegas do grupo do aluno logado, sem ele mesmo e sem alunos de fora do grupo", async () => {
        const groupmates = [
            { id: PEER_ID, name: "Carla Mendes" },
            { id: OTHER_PEER_ID, name: "Diego Martins" },
        ];
        // O aluno logado está no grupo: a lista precisa retirá-lo
        myGroup = makeGroup([LOGGED_STUDENT, ...groupmates]);
        const { user } = await renderPage();

        await user.click(pageButton());

        // Divergência conhecida: a página usa PEER_EVALUATION_MOCK_PEERS fixo em vez de useMyGroup
        const dialog = within(screen.getByRole("dialog", { name: /avaliação por pares/i }));
        await waitFor(() => expect(dialog.getAllByRole("listitem")).toHaveLength(groupmates.length));
        groupmates.forEach((peer) => expect(dialog.getByText(peer.name)).toBeInTheDocument());
        expect(dialog.queryByText(LOGGED_STUDENT.name)).not.toBeInTheDocument();
        // Colegas do mock que não são do grupo não podem aparecer: avaliá-los seria 403 no backend
        PEER_EVALUATION_MOCK_PEERS.forEach((peer) => expect(dialog.queryByText(peer.name)).not.toBeInTheDocument());
        expect(getUrls().some((url) => MY_GROUP_ROUTE.test(url))).toBe(true);
    });
});