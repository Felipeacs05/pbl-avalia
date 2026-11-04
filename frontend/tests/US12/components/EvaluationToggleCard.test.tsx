import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvaluationToggleCard } from "@/components/features/evaluations/EvaluationToggleCard";
import ReexportedDefault from "@/components/features/problem-details/EvaluationToggleCard";

function renderCard({ isChecked = false, disabled = false } = {}) {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
        <EvaluationToggleCard
            title="Autoavaliação"
            description="Aluno lança nota nos mesmos critérios da Tabela de Desempenho"
            isChecked={isChecked}
            disabled={disabled}
            onToggle={onToggle}
        />,
    );

    return {
        user,
        onToggle,
        // O <button role="switch"> interno deixa de ser "button": sobra só o card
        card: screen.getByRole("button"),
        toggle: screen.getByRole("switch", { name: "Autoavaliação" }),
    };
}

describe("[US12] EvaluationToggleCard", () => {
    it("Deve expor o estado do card em aria-checked no switch", () => {
        const { toggle } = renderCard({ isChecked: true });

        expect(toggle).toHaveAttribute("aria-checked", "true");
    });

    it("Deve indicar aria-checked=false quando a avaliação não está selecionada", () => {
        const { toggle } = renderCard({ isChecked: false });

        expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("Deve chamar onToggle uma única vez ao clicar no corpo do card", async () => {
        const { user, onToggle, card } = renderCard();

        await user.click(card);

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("Deve chamar onToggle uma única vez ao clicar no switch, sem duplicar pelo clique do card", async () => {
        const { user, onToggle, toggle } = renderCard();

        // Sem o stopPropagation o clique subiria ao card e alternaria duas vezes (voltaria ao estado anterior)
        await user.click(toggle);

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("Deve alternar com Enter quando o card está focado", async () => {
        const { user, onToggle, card } = renderCard();

        card.focus();
        await user.keyboard("{Enter}");

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("Deve alternar com Espaço quando o card está focado", async () => {
        const { user, onToggle, card } = renderCard();

        card.focus();
        await user.keyboard(" ");

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("[QA] Deve alternar uma única vez ao pressionar Enter com o foco no switch", async () => {
        const { user, onToggle, toggle } = renderCard();

        // Quem navega por teclado cai primeiro no switch: Enter não pode disparar o botão e o card ao mesmo tempo
        toggle.focus();
        await user.keyboard("{Enter}");

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("Deve bloquear o switch quando o card está desabilitado", async () => {
        const { user, onToggle, toggle } = renderCard({ disabled: true });

        expect(toggle).toBeDisabled();
        await user.click(toggle);

        expect(onToggle).not.toHaveBeenCalled();
    });

    it("[QA] Deve bloquear o clique no corpo do card quando ele está desabilitado", async () => {
        const { user, onToggle, card } = renderCard({ disabled: true });

        // Durante o envio, um clique no card não pode mudar a seleção que já está sendo gravada
        await user.click(card);

        expect(onToggle).not.toHaveBeenCalled();
    });

    it("[QA] Deve bloquear Enter no card quando ele está desabilitado", async () => {
        const { user, onToggle, card } = renderCard({ disabled: true });

        card.focus();
        await user.keyboard("{Enter}");

        expect(onToggle).not.toHaveBeenCalled();
    });

    it("Deve manter o re-export de problem-details apontando para o mesmo componente", () => {
        expect(ReexportedDefault).toBe(EvaluationToggleCard);
    });
});