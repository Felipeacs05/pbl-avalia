import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresetCriterionCard } from "@/components/features/performance-tables/PresetCriterionCard";
import type { PresetCriterion } from "@/types/performanceTable";
import { makeFixedCriterion, makePresetCriterion } from "../fixtures";

function renderCard(criterion: PresetCriterion = makePresetCriterion()) {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(<PresetCriterionCard criterion={criterion} onEdit={onEdit} onRemove={onRemove} />);

    return { user, onEdit, onRemove };
}

describe("[US07] PresetCriterionCard", () => {
    it("Deve exibir o nome e o peso em percentual do critério", () => {
        renderCard(makePresetCriterion({ name: "Participação", weight: 25 }));

        expect(screen.getByText("Participação")).toBeInTheDocument();
        expect(screen.getByText("Peso 25%")).toBeInTheDocument();
    });

    it("Deve oferecer editar e remover para o critério opcional, cada botão acionando só a sua ação", async () => {
        const { user, onEdit, onRemove } = renderCard();

        await user.click(screen.getByRole("button", { name: "Editar Participação" }));
        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onRemove).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Remover Participação" }));
        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("Deve esconder a lixeira do critério fixo (Papel), mantendo só a edição do peso", () => {
        renderCard(makeFixedCriterion());

        // Sem lixeira não há como tirar o Papel da tabela pela tela
        expect(screen.queryByRole("button", { name: /remover/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Editar Papel" })).toBeInTheDocument();
    });
});