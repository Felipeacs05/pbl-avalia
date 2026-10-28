import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoomList } from "@/components/features/rooms/RoomList";
import { makeOtherRoom, makeRoom } from "../fixtures";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

function renderList({
  rooms = [makeRoom(), makeOtherRoom()],
  onEnter = undefined as ((room: ReturnType<typeof makeRoom>) => void) | undefined,
  onEdit = vi.fn(),
  onCopyLink = vi.fn(),
  onDelete = vi.fn(),
} = {}) {
  const user = userEvent.setup();
  render(
    <RoomList
      rooms={rooms}
      onEnter={onEnter}
      onEdit={onEdit}
      onCopyLink={onCopyLink}
      onDelete={onDelete}
    />
  );

  return {
    user,
    rooms,
    onEnter,
    onEdit,
    onCopyLink,
    onDelete,
    items: screen.getAllByRole("listitem"),
  };
}

describe("[US03] RoomList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve renderizar todos os cards de sala dentro de uma lista", () => {
    const { items, rooms } = renderList();

    expect(items).toHaveLength(rooms.length);
    expect(screen.getByText(rooms[0].name)).toBeInTheDocument();
    expect(screen.getByText(rooms[1].name)).toBeInTheDocument();
  });

  it("Deve navegar para '/teacher-rooms/{id}/disciplines' ao clicar no card quando onEnter não for informado", async () => {
    const { user, items, rooms } = renderList();

    await user.click(items[0]);

    // Rota padrão do professor ao acessar a sala
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(`/teacher-rooms/${rooms[0].id}/disciplines`);
  });

  it("Deve invocar o callback onEnter customizado com a sala clicada quando fornecido", async () => {
    const onEnter = vi.fn();
    const { user, items, rooms } = renderList({ onEnter });

    await user.click(items[1]);

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith(rooms[1]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Deve repassar os callbacks de edição, cópia de link e exclusão para cada card", async () => {
    const onEdit = vi.fn();
    const onCopyLink = vi.fn();
    const onDelete = vi.fn();

    const { user, rooms } = renderList({ onEdit, onCopyLink, onDelete });

    const copyButtons = screen.getAllByRole("button", { name: "Copiar Link" });
    const editButtons = screen.getAllByRole("button", { name: "Editar" });
    const deleteButtons = screen.getAllByRole("button", { name: "Excluir" });

    await user.click(copyButtons[0]);
    expect(onCopyLink).toHaveBeenCalledWith(rooms[0]);

    await user.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(rooms[0]);

    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(rooms[0]);
  });
});
