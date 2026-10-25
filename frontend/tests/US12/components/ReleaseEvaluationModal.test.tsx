import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleaseEvaluationModal } from "@/components/features/evaluations/ReleaseEvaluationModal";
import ReexportedDefault from "@/components/features/problem-details/ReleaseEvaluationModal";
import type { EvaluationType } from "@/types/evaluation";

function renderModal({
                         isOpen = true,
                         selectedType = null as EvaluationType,
                         isSubmitting = false,
                     } = {}) {
    const onClose = vi.fn();
    const onToggleType = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
        <ReleaseEvaluationModal
            isOpen={isOpen}
            onClose={onClose}
            selectedType={selectedType}
            onToggleType={onToggleType}
            onConfirm={onConfirm}
            isSubmitting={isSubmitting}
        />,
    );

    return { user, onClose, onToggleType, onConfirm };
}

const dialog = () => screen.getByRole("dialog", { name: /liberar avaliações/i });
const selfSwitch = () => screen.getByRole("switch", { name: "Autoavaliação" });
const peerSwitch = () => screen.getByRole("switch", { name: "Avaliação entre Pares" });

describe("[US12] ReleaseEvaluationModal", () => {
    it("Deve renderizar nada quando está fechado", () => {
        renderModal({ isOpen: false });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Deve exibir as duas opções, refletindo o tipo selecionado", () => {
        renderModal({ selectedType: "peer_evaluation" });

        expect(selfSwitch()).toHaveAttribute("aria-checked", "false");
        expect(peerSwitch()).toHaveAttribute("aria-checked", "true");
    });

    it("Deve avisar o tipo tocado ao clicar em cada switch", async () => {
        const { user, onToggleType } = renderModal();

        await user.click(selfSwitch());
        await user.click(peerSwitch());

        expect(onToggleType).toHaveBeenNthCalledWith(1, "self_evaluation");
        expect(onToggleType).toHaveBeenNthCalledWith(2, "peer_evaluation");
    });

    it("Deve confirmar a liberação pelo botão \"Liberar\"", async () => {
        const { user, onConfirm } = renderModal({ selectedType: "self_evaluation" });

        await user.click(screen.getByRole("button", { name: "Liberar" }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("Deve fechar com a tecla Esc", async () => {
        const { user, onClose } = renderModal();

        await user.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve fechar pelo botão X", async () => {
        const { user, onClose } = renderModal();

        await user.click(screen.getByRole("button", { name: "Fechar modal" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve fechar ao clicar no fundo escuro", async () => {
        const { user, onClose } = renderModal();

        // O role="dialog" está no próprio fundo: clicar nele é clicar fora do card
        await user.click(dialog());

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve manter o modal aberto ao clicar dentro do card", async () => {
        const { user, onClose } = renderModal();

        await user.click(screen.getByRole("heading", { name: /liberar avaliações/i }));

        expect(onClose).not.toHaveBeenCalled();
    });

    it("Deve exibir \"Liberando...\" e travar os switches e o botão durante o envio", () => {
        renderModal({ selectedType: "self_evaluation", isSubmitting: true });

        expect(screen.getByRole("button", { name: /liberando/i })).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Liberar" })).not.toBeInTheDocument();
        expect(selfSwitch()).toBeDisabled();
        expect(peerSwitch()).toBeDisabled();
    });

    it("[QA] Deve ignorar cliques no corpo dos cards durante o envio", async () => {
        const { user, onToggleType } = renderModal({ isSubmitting: true });

        // Cada card é um role="button" com o texto da descrição; o clique nele não pode mudar a seleção em andamento
        await user.click(screen.getByText("Cada aluno avalia os colegas da turma."));

        expect(onToggleType).not.toHaveBeenCalled();
    });

    it("Deve manter o re-export de problem-details apontando para o mesmo componente", () => {
        expect(ReexportedDefault).toBe(ReleaseEvaluationModal);
    });
});