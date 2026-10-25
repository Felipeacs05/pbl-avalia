import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelfEvaluationModal } from "@/components/features/evaluations/SelfEvaluationModal";
import type { SelfEvaluationSubmission } from "@/types/evaluation";
import type { Student } from "@/types/group";
import {
    CLOSED_TITLE_MESSAGE,
    FORBIDDEN_MESSAGE,
    GENERIC_ERROR_MESSAGE,
    makeForbiddenError,
    makeOtherStudent,
    makeSelfEvaluationSubmission,
    makeServerError,
    makeStudent,
    makeThirdStudent,
    NO_PEERS_TEXT,
    OTHER_STUDENT_ID,
    STUDENT_ID,
} from "../fixtures";

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
                         isOpen = true,
                         isEvaluationOpen = true,
                         peers = [makeStudent(), makeOtherStudent()] as Student[],
                     } = {}) {
    const onSubmit = vi.fn<(data: SelfEvaluationSubmission) => Promise<void>>().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
        <SelfEvaluationModal
            isOpen={isOpen}
            onClose={onClose}
            isEvaluationOpen={isEvaluationOpen}
            peers={peers}
            onSubmit={onSubmit}
        />,
    );

    return { user, onSubmit, onClose, peers };
}

const slider = (name: string | RegExp) => screen.getByRole("slider", { name });
const sendButton = () => screen.getByRole("button", { name: /enviar avaliação/i });

// fireEvent: o user-event não arrasta sliders; o change é o que o navegador dispara
function setSlider(element: HTMLElement, value: string | number) {
    fireEvent.change(element, { target: { value: String(value) } });
}

const CRITERIA = ["Bom seguimento e conteúdo", "Participação", "Comportamento"];

describe("[US13] SelfEvaluationModal", () => {
    it("Deve renderizar nada quando o modal está fechado", () => {
        renderModal({ isOpen: false });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // --- PERÍODO ENCERRADO ---

    it("Deve exibir só o aviso de período encerrado e o botão Entendi, sem formulário, quando a autoavaliação não está liberada", async () => {
        const { user, onClose, onSubmit } = renderModal({ isEvaluationOpen: false });

        expect(screen.getByRole("status")).toHaveTextContent(CLOSED_TITLE_MESSAGE);
        // O formulário nem é montado: não há como enviar nota fora do período
        expect(screen.queryByRole("slider")).not.toBeInTheDocument();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /enviar avaliação/i })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Entendi" }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    // --- FORMULÁRIO ABERTO ---

    it("Deve exibir os 3 critérios como sliders de 0 a 10 com passo 1, todos começando em 0", () => {
        renderModal();

        CRITERIA.forEach((name) => {
            const input = slider(name);
            // min/max/step são o que impede notas fora da faixa e quebradas (7.5) na interface
            expect(input).toHaveAttribute("min", "0");
            expect(input).toHaveAttribute("max", "10");
            expect(input).toHaveAttribute("step", "1");
            expect(input).toHaveValue("0");
            expect(input).toHaveAttribute("aria-valuetext", "0 de 10");
        });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("Deve mostrar o valor escolhido ao lado do critério e no texto acessível do slider", () => {
        renderModal();
        const participation = slider("Participação");

        setSlider(participation, 7);

        // O slider sozinho não mostra o número: o valor aparece na caixa do critério
        expect(within(participation.parentElement!).getByText("7")).toBeInTheDocument();
        expect(participation).toHaveAttribute("aria-valuetext", "7 de 10");
        // Os outros critérios não mudam
        expect(slider("Comportamento")).toHaveAttribute("aria-valuetext", "0 de 10");
    });

    it("Deve oferecer um slider de 0 a 10 e um comentário opcional para cada colega do grupo", () => {
        const { peers } = renderModal({ peers: [makeStudent(), makeOtherStudent(), makeThirdStudent()] });

        expect(screen.getByText("Colegas do grupo (3)")).toBeInTheDocument();
        [...peers, makeThirdStudent()].slice(0, 3).forEach((peer) => {
            const input = slider(peer.name);
            expect(input).toHaveAttribute("min", "0");
            expect(input).toHaveAttribute("max", "10");
            expect(input).toHaveAttribute("step", "1");
            expect(screen.getByLabelText(`Comentário sobre ${peer.name}`)).toBeInTheDocument();
        });
    });

    it("Deve avisar que não há colegas e ainda permitir o envio sem lista de pares", async () => {
        const { user, onSubmit } = renderModal({ peers: [] });

        expect(screen.getByText(NO_PEERS_TEXT)).toBeInTheDocument();
        expect(screen.getByText("Colegas do grupo (0)")).toBeInTheDocument();

        await user.click(sendButton());

        expect(onSubmit).toHaveBeenCalledWith(makeSelfEvaluationSubmission({
            scores: { content: 0, participation: 0, behavior: 0 },
            justification: "",
            peers: [],
        }));
    });

    // --- SUBMISSÃO ---

    it("Deve enviar notas, justificativa sem espaços nas pontas e uma entrada por colega, e fechar quando o envio resolve", async () => {
        const { user, onSubmit, onClose } = renderModal();

        setSlider(slider("Bom seguimento e conteúdo"), 8);
        setSlider(slider("Participação"), 7);
        setSlider(slider("Comportamento"), 9);
        await user.type(screen.getByLabelText(/justificativa/i), "  Participei bastante  ");
        // Só a Alice é mexida; o Bruno fica intocado
        setSlider(slider("Alice Souza"), 6);
        await user.type(screen.getByLabelText("Comentário sobre Alice Souza"), "  Ajudou  ");
        await user.click(sendButton());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
            makeSelfEvaluationSubmission({
                scores: { content: 8, participation: 7, behavior: 9 },
                justification: "Participei bastante", // trim
                peers: [
                    { studentId: STUDENT_ID, score: 6, comment: "Ajudou" }, // trim também no comentário
                    // Colega não mexido também vai, com nota 0 (comportamento atual; ver divergências)
                    { studentId: OTHER_STUDENT_ID, score: 0, comment: "" },
                ],
            }),
        );
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it("Deve enviar uma entrada para cada colega mesmo sem tocar em nenhum slider, na ordem recebida", async () => {
        const { user, onSubmit } = renderModal({ peers: [makeThirdStudent(), makeStudent(), makeOtherStudent()] });

        await user.click(sendButton());

        // O back-end precisa receber todos os membros do grupo, não só os que o aluno mexeu
        const { peers } = onSubmit.mock.calls[0][0];
        expect(peers.map((peer) => peer.studentId)).toEqual([makeThirdStudent().id, STUDENT_ID, OTHER_STUDENT_ID]);
    });

    it("Deve exibir Enviando..., desabilitar todos os controles e só fechar depois que o envio resolve", async () => {
        const pending = deferred<void>();
        const { user, onSubmit, onClose } = renderModal();
        onSubmit.mockReturnValue(pending.promise);

        await user.click(sendButton());

        // Envio pendente: nada pode ser editado nem reenviado (evita envio duplicado)
        const sending = screen.getByRole("button", { name: /enviando/i });
        expect(sending).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
        screen.getAllByRole("slider").forEach((input) => expect(input).toBeDisabled());
        screen.getAllByRole("textbox").forEach((input) => expect(input).toBeDisabled());
        await user.click(sending);
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();

        await act_resolve(pending);

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    // --- ERROS ---

    it("Deve exibir em role=\"alert\" a mensagem de encerramento e não fechar quando o backend recusa com 403", async () => {
        const { user, onSubmit, onClose } = renderModal();
        onSubmit.mockRejectedValue(makeForbiddenError());

        await user.click(sendButton());

        expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
        // O aluno não perde o que digitou: o modal continua aberto e o envio volta a ficar disponível
        expect(onClose).not.toHaveBeenCalled();
        expect(sendButton()).toBeEnabled();
    });

    it("Deve exibir a mensagem genérica e não fechar quando o envio falha por outro motivo", async () => {
        const { user, onSubmit, onClose } = renderModal();
        onSubmit.mockRejectedValue(makeServerError());

        await user.click(sendButton());

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(GENERIC_ERROR_MESSAGE);
        // 403 e erro genérico têm textos diferentes: a mensagem de encerramento não pode vazar aqui
        expect(alert).not.toHaveTextContent(FORBIDDEN_MESSAGE);
        expect(onClose).not.toHaveBeenCalled();
    });

    it("Deve tratar como erro genérico a rejeição sem response (falha de rede)", async () => {
        const { user, onSubmit } = renderModal();
        onSubmit.mockRejectedValue(new Error("Network Error"));

        await user.click(sendButton());

        expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC_ERROR_MESSAGE);
    });

    it("Deve limpar o alerta e fechar quando o reenvio é aceito", async () => {
        const { user, onSubmit, onClose } = renderModal();
        onSubmit.mockRejectedValueOnce(makeForbiddenError()).mockResolvedValueOnce(undefined);

        await user.click(sendButton());
        expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);

        await user.click(sendButton());

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    // --- FECHAMENTO ---

    it("Deve fechar com Esc", async () => {
        const { user, onClose } = renderModal();

        await user.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve fechar com o clique no fundo, com o botão de fechar e com Cancelar, mas não com clique dentro do card", async () => {
        const { user, onClose } = renderModal();

        // Dentro do card: o stopPropagation impede o fechamento
        await user.click(screen.getByRole("heading", { name: "Autoavaliação" }));
        expect(onClose).not.toHaveBeenCalled();

        await user.click(screen.getByRole("dialog"));
        expect(onClose).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole("button", { name: "Fechar modal" }));
        expect(onClose).toHaveBeenCalledTimes(2);

        await user.click(screen.getByRole("button", { name: "Cancelar" }));
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it("Deve não ouvir Esc quando o modal está fechado", async () => {
        const { user, onClose } = renderModal({ isOpen: false });

        await user.keyboard("{Escape}");

        expect(onClose).not.toHaveBeenCalled();
    });

    // --- LIMITES 0 A 10 ---

    // jsdom e navegador saneiam o valor do range ao min/max: o clampScore é a segunda barreira.
    // Nos dois casos o resultado esperado é o mesmo, então os testes valem para ambos.
    it.each([
        { typed: "15", expected: 10 },
        { typed: "11", expected: 10 },
        { typed: "-1", expected: 0 },
        { typed: "-5", expected: 0 },
    ])("[QA] Deve limitar a nota digitada $typed a $expected nos critérios e nos colegas", async ({ typed, expected }) => {
        const { user, onSubmit } = renderModal();

        setSlider(slider("Participação"), typed);
        setSlider(slider("Alice Souza"), typed);

        expect(slider("Participação")).toHaveAttribute("aria-valuetext", `${expected} de 10`);
        expect(slider("Alice Souza")).toHaveAttribute("aria-valuetext", `${expected} de 10`);

        await user.click(sendButton());

        // O que sai para o backend também respeita a faixa (limite superior 10, inferior 0)
        const payload = onSubmit.mock.calls[0][0];
        expect(payload.scores.participation).toBe(expected);
        expect(payload.peers[0].score).toBe(expected);
    });

    it.each([
        { typed: "0", expected: 0 },
        { typed: "10", expected: 10 },
        { typed: "7.4", expected: 7 }, // notas quebradas viram inteiros (step 1 + Math.round)
    ])("[QA] Deve aceitar o limite %# da faixa e arredondar para inteiro ($typed -> $expected)", async ({ typed, expected }) => {
        const { user, onSubmit } = renderModal();

        setSlider(slider("Comportamento"), typed);
        await user.click(sendButton());

        expect(onSubmit.mock.calls[0][0].scores.behavior).toBe(expected);
    });

    it("[QA] Deve manter sempre uma nota inteira de 0 a 10 mesmo quando o slider recebe valor não numérico", async () => {
        const { user, onSubmit } = renderModal();

        // NaN: o navegador/jsdom saneia texto inválido para o ponto médio do range (5), então o ramo
        // NaN -> 0 do clampScore não é alcançável pelo DOM. O que importa ao aluno é o invariante abaixo.
        setSlider(slider("Participação"), "abc");
        await user.click(sendButton());

        const { participation } = onSubmit.mock.calls[0][0].scores;
        expect(Number.isInteger(participation)).toBe(true);
        expect(participation).toBeGreaterThanOrEqual(0);
        expect(participation).toBeLessThanOrEqual(10);
    });
});

// Resolve a promessa pendente dentro de act, para o React processar o fim do envio
async function act_resolve(pending: { resolve: (value: void) => void }) {
    const { act } = await import("@testing-library/react");
    await act(async () => {
        pending.resolve();
    });
}