import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoomCard } from "@/components/features/rooms/RoomCard";
import {
  COPY_LINK_LABEL,
  DELETE_LABEL,
  EDIT_LABEL,
  makeRoom,
} from "../fixtures";

function renderCard({
  room = makeRoom({
    name: "Circuitos Digitais",
    code: "CIR101",
    semester: "2026.2",
  }),
  onEnter = vi.fn(),
  onEdit = vi.fn(),
  onCopyLink = vi.fn(),
  onDelete = vi.fn(),
} = {}) {
  const user = userEvent.setup();
  render(
    <RoomCard
      room={room}
      onEnter={onEnter}
      onEdit={onEdit}
      onCopyLink={onCopyLink}
      onDelete={onDelete}
    />
  );

  return {
    user,
    room,
    onEnter,
    onEdit,
    onCopyLink,
    onDelete,
    card: screen.getByRole("listitem"),
    copyButton: screen.getByRole("button", { name: COPY_LINK_LABEL }),
    editButton: screen.getByRole("button", { name: EDIT_LABEL }),
    deleteButton: screen.getByRole("button", { name: DELETE_LABEL }),
  };
}

describe("[US03] RoomCard", () => {
  it("Deve exibir o nome da sala, o código e o semestre", () => {
    const { room } = renderCard();

    expect(screen.getByText(room.name)).toBeInTheDocument();
    expect(screen.getByText(room.code)).toBeInTheDocument();
    expect(screen.getByText(`Semestre: ${room.semester}`)).toBeInTheDocument();
  });

  it("Deve renderizar os botões de ação com aria-labels 'Copiar Link', 'Editar' e 'Excluir'", () => {
    const { copyButton, editButton, deleteButton } = renderCard();

    expect(copyButton).toBeInTheDocument();
    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
  });

  it("Deve chamar onEnter ao clicar no corpo do card", async () => {
    const { user, card, onEnter } = renderCard();

    await user.click(card);

    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("Deve isolar eventos (stopPropagation) e não disparar onEnter ao clicar em 'Copiar Link'", async () => {
    const { user, copyButton, onCopyLink, onEnter } = renderCard();

    await user.click(copyButton);

    expect(onCopyLink).toHaveBeenCalledTimes(1);
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("Deve isolar eventos (stopPropagation) e não disparar onEnter ao clicar em 'Editar'", async () => {
    const { user, editButton, onEdit, onEnter } = renderCard();

    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("Deve isolar eventos (stopPropagation) e não disparar onEnter ao clicar em 'Excluir'", async () => {
    const { user, deleteButton, onDelete, onEnter } = renderCard();

    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEnter).not.toHaveBeenCalled();
  });
});
