import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleaseEvaluationButton } from "@/components/features/problem-details/ReleaseEvaluationButton";
import type { EvaluationType } from "@/types/evaluation";

function renderButton(props: {
    isLoading?: boolean;
    isReleased?: boolean;
    activeType?: EvaluationType;
    label?: string;
} = {}) {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<ReleaseEvaluationButton onClick={onClick} {...props} />);

    return { user, onClick, button: screen.getByRole("button") };
}

describe("[US12] ReleaseEvaluationButton", () => {
    it("Deve exibir \"Liberar Avaliações\" quando nada está liberado", () => {
        const { button } = renderButton();

        expect(button).toHaveAccessibleName("Liberar Avaliações");
    });

    it("Deve exibir \"Autoavaliação Liberada\" quando a autoavaliação está liberada", () => {
        const { button } = renderButton({ isReleased: true, activeType: "self_evaluation" });

        expect(button).toHaveAccessibleName("Autoavaliação Liberada");
    });

    it("Deve exibir \"Avaliação entre Pares Liberada\" quando a avaliação entre pares está liberada", () => {
        const { button } = renderButton({ isReleased: true, activeType: "peer_evaluation" });

        expect(button).toHaveAccessibleName("Avaliação entre Pares Liberada");
    });

    it("Deve exibir o texto genérico quando há liberação sem tipo definido", () => {
        const { button } = renderButton({ isReleased: true, activeType: null });

        expect(button).toHaveAccessibleName("Avaliação Liberada");
    });

    it("Deve exibir \"Carregando...\" e bloquear o clique enquanto carrega", async () => {
        const { user, onClick, button } = renderButton({ isLoading: true });

        expect(button).toHaveAccessibleName("Carregando...");
        expect(button).toBeDisabled();
        await user.click(button);

        expect(onClick).not.toHaveBeenCalled();
    });

    it("Deve preferir o label customizado a qualquer texto automático", () => {
        const { button } = renderButton({ label: "Abrir avaliação", isReleased: true, activeType: "self_evaluation" });

        expect(button).toHaveAccessibleName("Abrir avaliação");
    });

    it("Deve chamar onClick ao clicar quando não está carregando", async () => {
        const { user, onClick, button } = renderButton();

        await user.click(button);

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});