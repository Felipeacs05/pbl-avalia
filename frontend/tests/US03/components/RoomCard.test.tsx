import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoomCard } from "@/components/features/rooms/RoomCard";
import { makeRoom } from "../fixtures";

function renderCard() {
  const callbacks = {
    onEdit: vi.fn(),
    onCopyLink: vi.fn(),
    onDelete: vi.fn(),
  };
  const user = userEvent.setup();

  render(<RoomCard room={makeRoom()} {...callbacks} />);

  return { user, ...callbacks };
}

describe("[US03] RoomCard", () => {
  it("should display the room name", () => {
    renderCard();

    expect(screen.getByText(makeRoom().name)).toBeInTheDocument();
  });

  it("[QA] should trigger only onCopyLink from the 'Copiar Link' button", async () => {
    const { user, onCopyLink, onEdit, onDelete } = renderCard();

    await user.click(screen.getByRole("button", { name: /copiar link/i }));

    expect(onCopyLink).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("should trigger only onEdit from the 'Editar' button", async () => {
    const { user, onEdit, onCopyLink, onDelete } = renderCard();

    await user.click(screen.getByRole("button", { name: /editar/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCopyLink).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("should trigger only onDelete from the 'Excluir' button", async () => {
    const { user, onDelete, onCopyLink, onEdit } = renderCard();

    await user.click(screen.getByRole("button", { name: /excluir/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCopyLink).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
