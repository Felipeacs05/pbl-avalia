import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProblemCard } from "@/components/features/disciplines/ProblemCard";
import { makeProblem } from "../fixtures";

function renderCard() {
    const callbacks = {
        onClick: vi.fn(),
        onViewStats: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
    };
    const user = userEvent.setup();

    render(<ProblemCard problem={makeProblem()} {...callbacks} />);

    return { user, ...callbacks };
}

describe("[US05] ProblemCard", () => {
    it("Deve exibir o título como cabeçalho e a descrição do problema", () => {
        renderCard();

        expect(screen.getByRole("heading", { level: 3, name: makeProblem().title })).toBeInTheDocument();
        expect(screen.getByText(makeProblem().description)).toBeInTheDocument();
    });

    it("Deve navegar (onClick) ao tocar no corpo do card", async () => {
        const { user, onClick, onViewStats, onEdit, onDelete } = renderCard();

        await user.click(screen.getByRole("heading", { name: makeProblem().title }));

        expect(onClick).toHaveBeenCalledTimes(1);
        expect(onViewStats).not.toHaveBeenCalled();
        expect(onEdit).not.toHaveBeenCalled();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("Deve acionar só onViewStats pelo botão \"Statistics\", sem navegar", async () => {
        const { user, onClick, onViewStats, onEdit, onDelete } = renderCard();

        await user.click(screen.getByRole("button", { name: "Statistics" }));

        expect(onViewStats).toHaveBeenCalledTimes(1);
        expect(onEdit).not.toHaveBeenCalled();
        expect(onDelete).not.toHaveBeenCalled();
        // stopPropagation: o toque no ícone não pode abrir o problema
        expect(onClick).not.toHaveBeenCalled();
    });

    it("Deve acionar só onEdit pelo botão \"Edit problem\", sem navegar", async () => {
        const { user, onClick, onViewStats, onEdit, onDelete } = renderCard();

        await user.click(screen.getByRole("button", { name: "Edit problem" }));

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onViewStats).not.toHaveBeenCalled();
        expect(onDelete).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
    });

    it("Deve acionar só onDelete pelo botão \"Delete problem\", sem navegar", async () => {
        const { user, onClick, onViewStats, onEdit, onDelete } = renderCard();

        await user.click(screen.getByRole("button", { name: "Delete problem" }));

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onViewStats).not.toHaveBeenCalled();
        expect(onEdit).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
    });

    it("Deve tolerar o card sem nenhum callback, sem lançar erro nos toques", async () => {
        const user = userEvent.setup();
        render(<ProblemCard problem={makeProblem()} />);

        await user.click(screen.getByRole("button", { name: "Statistics" }));
        await user.click(screen.getByRole("button", { name: "Edit problem" }));
        await user.click(screen.getByRole("button", { name: "Delete problem" }));
        await user.click(screen.getByRole("heading", { name: makeProblem().title }));

        expect(screen.getByRole("heading", { name: makeProblem().title })).toBeInTheDocument();
    });
});