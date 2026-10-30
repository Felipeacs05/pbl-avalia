import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PeerEvaluationModal } from "@/components/features/evaluations/PeerEvaluationModal";
import type { PeerEvaluationSubmission } from "@/types/evaluation";
import type { Student } from "@/types/student";
import {
    CLOSED_MESSAGE,
    FILL_ALL_HINT,
    GENERIC_ERROR_MESSAGE,
    INACTIVE_TITLE,
    LOGGED_STUDENT,
    makeForbiddenError,
    makePeers,
    makeServerError,
    NO_PEERS_MESSAGE,
} from "../fixtures";

type User = ReturnType<typeof userEvent.setup>;
type Scores = [number, number, number];

// Promessa controlada pelo teste: permite olhar a tela enquanto o envio ainda está pendente
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function renderModal({
                         peers = makePeers(3),
                         isOpen = true,
                         isEvaluationOpen = true,
                     }: { peers?: Student[]; isOpen?: boolean; isEvaluationOpen?: boolean } = {}) {
    const onSubmit = vi.fn<(data: PeerEvaluationSubmission) => Promise<void>>().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    const view = render(
        <PeerEvaluationModal
            isOpen={isOpen}
            onClose={onClose}
            isEvaluationOpen={isEvaluationOpen}
            peers={peers}
            onSubmit={onSubmit}
        />,
    );

    return {
        ...view,
        user,
        peers,
        onSubmit,
        onClose,
        // Busca preguiçosa: o nome do botão muda para "Enviando..." durante o envio
        sendButton: () => screen.getByRole("button", { name: "Enviar Avaliações" }),
    };
}

function cardOf(name: string): HTMLElement {
    const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
    if (!item) throw new Error(`card do colega ${name} não encontrado`);
    return item;
}

function headerOf(name: string) {
    return within(cardOf(name)).getByRole("button", { name: new RegExp(name) });
}

async function openCard(user: User, name: string) {
    if (headerOf(name).getAttribute("aria-expanded") !== "true") await user.click(headerOf(name));
}

async function fillScores(user: User, name: string, scores: Scores) {
    await openCard(user, name);
    const card = within(cardOf(name));
    await user.type(card.getByLabelText(/conteúdo\/produto/i), String(scores[0]));
    await user.type(card.getByLabelText(/participação/i), String(scores[1]));
    await user.type(card.getByLabelText(/comportamento/i), String(scores[2]));
}

async function fillAll(user: User, peers: Student[], scores: Scores = [8, 9, 7]) {
    for (const peer of peers) await fillScores(user, peer.name, scores);
}

describe("[US14] PeerEvaluationModal", () => {
    // --- LISTA DE COLEGAS ---

    it("Deve exibir o diálogo com o título, o aviso de anonimato e só os colegas recebidos", () => {
        const { peers } = renderModal();

        expect(screen.getByRole("dialog", { name: /avaliação por pares/i })).toBeInTheDocument();
        expect(screen.getByText(/suas notas são anônimas para os colegas/i)).toBeInTheDocument();
        expect(screen.getByText("Colegas do grupo (3)")).toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(peers.length);
        peers.forEach((peer) => expect(screen.getByText(peer.name)).toBeInTheDocument());
        // O modal não conhece o aluno logado: quem o retira da lista é a página
        expect(screen.queryByText(LOGGED_STUDENT.name)).not.toBeInTheDocument();
    });

    it("Deve renderizar nada quando o modal está fechado", () => {
        const { container } = renderModal({ isOpen: false });

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Deve avisar que não há colegas e manter o envio bloqueado quando o grupo está vazio", () => {
        const { sendButton } = renderModal({ peers: [] });

        expect(screen.getByText("Colegas do grupo (0)")).toBeInTheDocument();
        expect(screen.getByText(NO_PEERS_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
        // Sem colegas não há o que enviar: "todas as notas preenchidas" seria verdade vazia
        expect(sendButton()).toBeDisabled();
    });

    // --- ACORDEÃO ---

    it("Deve abrir só o primeiro card ao montar, como no Figma", () => {
        const { peers } = renderModal();

        expect(headerOf(peers[0].name)).toHaveAttribute("aria-expanded", "true");
        expect(headerOf(peers[1].name)).toHaveAttribute("aria-expanded", "false");
        expect(headerOf(peers[2].name)).toHaveAttribute("aria-expanded", "false");
        expect(within(cardOf(peers[0].name)).getByLabelText(/conteúdo\/produto/i)).toBeInTheDocument();
        expect(within(cardOf(peers[1].name)).queryByLabelText(/conteúdo\/produto/i)).not.toBeInTheDocument();
    });

    it("Deve fechar o card aberto ao abrir outro e recolher o card ao tocar nele de novo", async () => {
        const { user, peers } = renderModal();

        await user.click(headerOf(peers[1].name));

        expect(headerOf(peers[1].name)).toHaveAttribute("aria-expanded", "true");
        expect(headerOf(peers[0].name)).toHaveAttribute("aria-expanded", "false");

        await user.click(headerOf(peers[1].name));

        expect(headerOf(peers[1].name)).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByLabelText(/conteúdo\/produto/i)).not.toBeInTheDocument();
    });

    it("Deve preservar as notas de um colega ao recolher e reabrir o card", async () => {
        const { user, peers } = renderModal();

        await fillScores(user, peers[0].name, [8, 9, 7]);
        await user.click(headerOf(peers[1].name));
        await user.click(headerOf(peers[0].name));

        // O rascunho vive no modal, não no card: fechar o card não pode apagar o que foi digitado
        const card = within(cardOf(peers[0].name));
        expect(card.getByLabelText(/conteúdo\/produto/i)).toHaveValue(8);
        expect(card.getByLabelText(/participação/i)).toHaveValue(9);
        expect(card.getByLabelText(/comportamento/i)).toHaveValue(7);
    });

    // --- LIBERAÇÃO DO ENVIO ---

    it("Deve manter o envio desabilitado, com a dica, até todas as notas de todos os colegas estarem preenchidas", async () => {
        const { user, peers, sendButton } = renderModal({ peers: makePeers(2) });

        expect(sendButton()).toBeDisabled();
        expect(screen.getByText(FILL_ALL_HINT)).toBeInTheDocument();

        // Colega 1 completo: ainda falta o colega 2
        await fillScores(user, peers[0].name, [8, 9, 7]);
        expect(within(cardOf(peers[0].name)).getByLabelText("Notas completas")).toBeInTheDocument();
        expect(sendButton()).toBeDisabled();

        // Colega 2 com 2 de 3 notas: continua bloqueado
        await openCard(user, peers[1].name);
        const second = within(cardOf(peers[1].name));
        await user.type(second.getByLabelText(/conteúdo\/produto/i), "6");
        await user.type(second.getByLabelText(/participação/i), "10");
        expect(screen.getByText("2/3")).toBeInTheDocument();
        expect(sendButton()).toBeDisabled();

        // Última nota: libera
        await user.type(second.getByLabelText(/comportamento/i), "5");
        expect(sendButton()).toBeEnabled();
    });

    it("Deve aceitar a nota 0 como preenchida, liberando o envio", async () => {
        const { user, peers, sendButton } = renderModal({ peers: makePeers(1) });

        await fillScores(user, peers[0].name, [0, 0, 0]);

        // Zero é nota válida: tratar 0 como vazio travaria quem avalia um colega com zero
        expect(sendButton()).toBeEnabled();
    });

    it("[QA] Deve limitar a nota digitada acima de 10 a 10 e a abaixo de 0 a 0", async () => {
        const { user, peers } = renderModal({ peers: makePeers(1) });
        const card = within(cardOf(peers[0].name));
        const content = card.getByLabelText(/conteúdo\/produto/i);
        const participation = card.getByLabelText(/participação/i);

        await user.type(content, "15");
        fireEvent.change(participation, { target: { value: "-1" } });

        expect(content).toHaveValue(10);
        expect(participation).toHaveValue(0);
    });

    it("[QA] Deve manter o envio bloqueado enquanto algum colega estiver sem comentário (plano US14: comentário obrigatório)", async () => {
        const { user, peers, sendButton } = renderModal({ peers: makePeers(2) });

        await fillAll(user, peers);

        // Divergência conhecida: o plano exige nota + comentário de texto para cada colega; hoje o comentário é opcional
        expect(sendButton()).toBeDisabled();

        for (const peer of peers) {
            await openCard(user, peer.name);
            await user.type(within(cardOf(peer.name)).getByLabelText(/comentário sobre/i), "Boa participação");
        }
        expect(sendButton()).toBeEnabled();
    });

    // --- PAYLOAD ---

    it("Deve enviar uma avaliação por colega, na ordem recebida, com o comentário sem espaços nas pontas, e fechar", async () => {
        const { user, peers, onSubmit, onClose, sendButton } = renderModal({ peers: makePeers(2) });

        await fillScores(user, peers[0].name, [8, 9, 7]);
        await user.type(within(cardOf(peers[0].name)).getByLabelText(/comentário sobre/i), "  Ótima participação  ");
        await fillScores(user, peers[1].name, [10, 6, 5]);
        await user.click(sendButton());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({
            evaluations: [
                {
                    studentId: peers[0].id,
                    scores: { content: 8, participation: 9, behavior: 7 },
                    comment: "Ótima participação",
                },
                // Colega sem comentário: vai vazio, não undefined
                { studentId: peers[1].id, scores: { content: 10, participation: 6, behavior: 5 }, comment: "" },
            ],
        });
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    // --- ENVIO EM ANDAMENTO ---

    it("Deve exibir \"Enviando...\", travar os campos e enviar uma única vez mesmo com toques repetidos", async () => {
        const { user, peers, onSubmit, onClose } = renderModal({ peers: makePeers(1) });
        const pending = deferred<void>();
        onSubmit.mockReturnValue(pending.promise);
        await fillAll(user, peers);

        await user.click(screen.getByRole("button", { name: "Enviar Avaliações" }));
        const sending = screen.getByRole("button", { name: /enviando/i });
        await user.click(sending);
        await user.click(sending);

        expect(sending).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
        expect(within(cardOf(peers[0].name)).getByLabelText(/conteúdo\/produto/i)).toBeDisabled();
        expect(onSubmit).toHaveBeenCalledTimes(1);
        // Sem resposta, o modal não fecha: a confirmação depende do envio
        expect(onClose).not.toHaveBeenCalled();

        pending.resolve();

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    // --- ERROS ---

    it("Deve avisar que a avaliação foi encerrada no 403, manter o modal e as notas e permitir novo envio", async () => {
        const { user, peers, onSubmit, onClose, sendButton } = renderModal({ peers: makePeers(2) });
        onSubmit.mockRejectedValueOnce(makeForbiddenError()).mockResolvedValueOnce(undefined);
        await fillAll(user, peers);

        await user.click(sendButton());

        // Encerrada pelo tutor ou colega de outro grupo: a mensagem cobre os dois motivos do 403
        expect(await screen.findByRole("alert")).toHaveTextContent(CLOSED_MESSAGE);
        expect(onClose).not.toHaveBeenCalled();
        expect(sendButton()).toBeEnabled();
        expect(within(cardOf(peers[1].name)).getByLabelText(/conteúdo\/produto/i)).toHaveValue(8);

        await user.click(sendButton());

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it.each([
        ["erro 500", makeServerError()],
        ["falha de rede sem resposta", new Error("Network Error")],
    ])("Deve exibir a mensagem genérica, e não a de encerrada, em %s", async (_case, error) => {
        const { user, peers, onSubmit, onClose, sendButton } = renderModal({ peers: makePeers(1) });
        onSubmit.mockRejectedValue(error);
        await fillAll(user, peers);

        await user.click(sendButton());

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(GENERIC_ERROR_MESSAGE);
        expect(alert).not.toHaveTextContent(CLOSED_MESSAGE);
        expect(onClose).not.toHaveBeenCalled();
    });

    // --- AVALIAÇÃO NÃO LIBERADA ---

    it("Deve exibir só o aviso de período encerrado, sem lista nem envio, quando o tutor não liberou", async () => {
        const { user, onClose } = renderModal({ isEvaluationOpen: false });

        expect(screen.getByRole("status")).toHaveTextContent(INACTIVE_TITLE);
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Enviar Avaliações" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Entendi" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // --- FECHAMENTO ---

    it("Deve fechar com Esc, com o X, com Cancelar e com o clique no fundo", async () => {
        const { user, onClose } = renderModal();

        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("button", { name: "Fechar modal" }));
        await user.click(screen.getByRole("button", { name: "Cancelar" }));
        await user.click(screen.getByRole("dialog"));

        expect(onClose).toHaveBeenCalledTimes(4);
    });

    it("Deve manter o modal aberto ao clicar dentro do card", async () => {
        const { user, onClose } = renderModal();

        await user.click(screen.getByRole("heading", { name: /avaliação por pares/i }));

        // O stopPropagation evita que um toque no conteúdo seja tratado como clique no fundo
        expect(onClose).not.toHaveBeenCalled();
    });
});