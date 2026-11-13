import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentCard } from "@/components/PhotoRoster/StudentCard";
import { ALICE, removeButtonName } from "../fixtures";

// Camada de UI (apresentação): só avisa o pedido de remoção; quem confirma e chama a API é o PhotoRosterList.
describe("[US24] StudentCard", () => {
  it("Deve mostrar o nome do aluno e um botão de remoção com nome acessível que identifica o aluno", () => {
    render(<StudentCard student={ALICE} onAction={vi.fn()} />);

    expect(screen.getByText(ALICE.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: removeButtonName(ALICE.name) })).toBeInTheDocument();
  });

  it("Deve entregar o aluno ao clicar em remover, sem decidir nada sozinho", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<StudentCard student={ALICE} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: removeButtonName(ALICE.name) }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(ALICE);
  });
});
