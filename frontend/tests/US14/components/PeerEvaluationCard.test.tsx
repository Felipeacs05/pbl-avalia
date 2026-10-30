import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    PEER_CRITERIA,
    PeerEvaluationCard,
    type DraftScores,
} from "@/components/features/evaluations/PeerEvaluationCard";
import type { PeerEvaluationScores } from "@/types/evaluation";
import { CRITERIA_KEYS, CRITERIA_LABELS, makeDraftScores, makePeer } from "../fixtures";

function renderCard({
                        peer = makePeer(),
                        scores = makeDraftScores() as DraftScores,
                        comment = "",
                        isExpanded = true,
                        disabled = false,
                    } = {}) {
    const onToggle = vi.fn();
    const onScoreChange = vi.fn<(key: keyof PeerEvaluationScores, value: number | null) => void>();
    const onCommentChange = vi.fn<(value: string) => void>();
    const user = userEvent.setup();

    const { container } = render(
        <PeerEvaluationCard
            peer={peer}
            scores={scores}
            comment={comment}
            isExpanded={isExpanded}
            onToggle={onToggle}
            onScoreChange={onScoreChange}
            onCommentChange={onCommentChange}
            disabled={disabled}
        />,
    );

    return {
        user,
        peer,
        container,
        onToggle,
        onScoreChange,
        onCommentChange,
        header: screen.getByRole("button", { name: new RegExp(peer.name) }),
    };
}

// Com alt="" a foto não tem papel acessível; o que importa é a presença do próprio <img>
function photoIn(container: HTMLElement) {
    return container.querySelector("img");
}

describe("[US14] PeerEvaluationCard", () => {
    it("Deve exportar os três critérios do Figma, na ordem em que aparecem", () => {
        expect(PEER_CRITERIA.map(({ key }) => key)).toEqual([...CRITERIA_KEYS]);
        expect(PEER_CRITERIA.map(({ label }) => label)).toEqual([...CRITERIA_LABELS]);
    });

    // --- ACORDEÃO ---

    it("Deve expor o cabeçalho com aria-expanded e aria-controls apontando para o conteúdo aberto", () => {
        const { header, peer } = renderCard({ isExpanded: true });

        expect(header).toHaveAttribute("aria-expanded", "true");
        // O leitor de tela só anuncia o vínculo se o id do conteúdo existir de fato
        const controlled = document.getElementById(header.getAttribute("aria-controls")!);
        expect(header).toHaveAttribute("aria-controls", `peer-card-content-${peer.id}`);
        expect(controlled).not.toBeNull();
    });

    it("Deve avisar aria-expanded=false e não montar o conteúdo quando o card está fechado", () => {
        const { header, peer } = renderCard({ isExpanded: false });

        expect(header).toHaveAttribute("aria-expanded", "false");
        expect(document.getElementById(`peer-card-content-${peer.id}`)).toBeNull();
        // Campos que não estão na tela não podem ser preenchidos nem lidos pelo leitor de tela
        CRITERIA_LABELS.forEach((label) => {
            expect(screen.queryByLabelText(new RegExp(label, "i"))).not.toBeInTheDocument();
        });
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("Deve montar um campo por critério e o comentário opcional só quando o card está aberto", () => {
        renderCard({ isExpanded: true });

        CRITERIA_LABELS.forEach((label) => {
            expect(screen.getByLabelText(new RegExp(label, "i"))).toBeInTheDocument();
        });
        expect(screen.getByLabelText(/comentário sobre alice ferreira/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/comentário \(opcional\)/i)).toBeInTheDocument();
    });

    it("Deve avisar o modal ao tocar no cabeçalho", async () => {
        const { user, header, onToggle } = renderCard();

        await user.click(header);

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    // --- PROGRESSO ---

    it.each([
        [makeDraftScores(), "0/3"],
        [makeDraftScores({ content: 8 }), "1/3"],
        [makeDraftScores({ content: 8, behavior: 5 }), "2/3"],
        // Nota 0 é nota preenchida: contar por "truthy" travaria o aluno que se dá zero
        [makeDraftScores({ content: 0 }), "1/3"],
    ])("Deve exibir o progresso %#: %s notas preenchidas", (scores, label) => {
        renderCard({ scores });

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.queryByLabelText("Notas completas")).not.toBeInTheDocument();
    });

    it("Deve trocar o progresso por um check de notas completas quando os três critérios têm nota", () => {
        renderCard({ scores: makeDraftScores({ content: 8, participation: 0, behavior: 10 }) });

        expect(screen.getByLabelText("Notas completas")).toBeInTheDocument();
        expect(screen.queryByText(/\d\/3/)).not.toBeInTheDocument();
    });

    // --- CAMPOS NUMÉRICOS ---

    it.each(CRITERIA_LABELS)("Deve restringir o campo %s a números inteiros de 0 a 10", (label) => {
        renderCard();

        const input = screen.getByLabelText(new RegExp(label, "i"));
        expect(input).toHaveAttribute("type", "number");
        expect(input).toHaveAttribute("min", "0");
        expect(input).toHaveAttribute("max", "10");
        expect(input).toHaveAttribute("step", "1");
        expect(input).toHaveAttribute("aria-required", "true");
    });

    it("Deve exibir a nota recebida por props e deixar vazio o critério sem nota", () => {
        renderCard({ scores: makeDraftScores({ content: 8, behavior: 0 }) });

        expect(screen.getByLabelText(/conteúdo\/produto/i)).toHaveValue(8);
        expect(screen.getByLabelText(/participação/i)).toHaveValue(null);
        expect(screen.getByLabelText(/comportamento/i)).toHaveValue(0);
    });

    // parseScore: a nota que o modal recebe já vem corrigida
    // fireEvent.change: o campo é controlado, então user.type não acumularia os dígitos
    it.each<[string, number | null]>([
        ["", null],
        ["15", 10],
        ["-1", 0],
        ["7.6", 8],
        ["7.4", 7],
        ["0", 0],
        ["10", 10],
    ])("[QA] Deve converter o valor digitado %j em %j antes de avisar o modal", (typed, expected) => {
        // Começa com nota 5 para que a mudança para "" ou outro valor dispare o onChange
        const { onScoreChange } = renderCard({ scores: makeDraftScores({ content: 5 }) });

        fireEvent.change(screen.getByLabelText(/conteúdo\/produto/i), { target: { value: typed } });

        expect(onScoreChange).toHaveBeenCalledTimes(1);
        expect(onScoreChange).toHaveBeenCalledWith("content", expected);
    });

    it.each(CRITERIA_KEYS.map((key, index) => [key, CRITERIA_LABELS[index]] as const))(
        "Deve avisar a chave %s ao alterar o campo %s",
        (key, label) => {
            const { onScoreChange } = renderCard();

            fireEvent.change(screen.getByLabelText(new RegExp(label, "i")), { target: { value: "6" } });

            // A chave identifica o critério: trocar a ordem dos campos não pode misturar as notas
            expect(onScoreChange).toHaveBeenCalledWith(key, 6);
        },
    );

    // --- COMENTÁRIO ---

    it("Deve exibir o comentário recebido e avisar o modal a cada mudança", () => {
        const { onCommentChange } = renderCard({ comment: "Bom trabalho" });

        const textarea = screen.getByLabelText(/comentário sobre alice ferreira/i);
        expect(textarea).toHaveValue("Bom trabalho");

        fireEvent.change(textarea, { target: { value: "Bom trabalho em equipe" } });

        expect(onCommentChange).toHaveBeenCalledWith("Bom trabalho em equipe");
    });

    // --- AVATAR ---

    it("Deve exibir a foto do colega quando o link é válido", () => {
        const { container, peer } = renderCard();

        expect(photoIn(container)).toHaveAttribute("src", peer.avatarUrl);
        expect(screen.queryByText("AF")).not.toBeInTheDocument();
    });

    it("[QA] Deve trocar a foto quebrada pelas iniciais, sem deixar o <img> na tela", () => {
        const { container } = renderCard();

        // userEvent não simula falha de rede; o evento error é o que o navegador dispara no link quebrado
        fireEvent.error(photoIn(container)!);

        expect(photoIn(container)).toBeNull();
        expect(screen.getByText("AF")).toBeInTheDocument();
    });

    it("Deve exibir as iniciais, sem <img>, quando o colega não tem foto", () => {
        const { container } = renderCard({ peer: makePeer({ name: "Mariana Costa Almeida", avatarUrl: "" }) });

        expect(photoIn(container)).toBeNull();
        // Primeira letra das duas primeiras palavras do nome
        expect(screen.getByText("MC")).toBeInTheDocument();
    });

    // --- DESABILITADO ---

    it("Deve desabilitar notas e comentário enquanto o envio está em andamento", () => {
        const { header } = renderCard({ disabled: true });

        CRITERIA_LABELS.forEach((label) => {
            expect(screen.getByLabelText(new RegExp(label, "i"))).toBeDisabled();
        });
        expect(screen.getByLabelText(/comentário sobre alice ferreira/i)).toBeDisabled();
        // O cabeçalho continua clicável: recolher o card não altera nenhuma nota
        expect(header).toBeEnabled();
    });
});