import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoomList } from "@/components/features/rooms/RoomList";
import { makeOtherRoom, makeRoom } from "../fixtures";

function renderList() {
  const rooms = [makeRoom(), makeOtherRoom()];
  const callbacks = {
    onEdit: vi.fn(),
    onCopyLink: vi.fn(),
    onDelete: vi.fn(),
  };
  const user = userEvent.setup();

  render(<RoomList rooms={rooms} {...callbacks} />);

  return { rooms, user, ...callbacks };
}

describe("[US03] RoomList", () => {
  it("should render one list item per room", () => {
    const { rooms } = renderList();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(rooms.length);
    rooms.forEach((room, index) => {
      expect(within(items[index]).getByText(room.name)).toBeInTheDocument();
    });
  });

  it("should pass the clicked room to each action", async () => {
    const { rooms, user, onEdit, onCopyLink, onDelete } = renderList();
    const secondItem = within(screen.getAllByRole("listitem")[1]);

    await user.click(secondItem.getByRole("button", { name: /copiar link/i }));
    await user.click(secondItem.getByRole("button", { name: /editar/i }));
    await user.click(secondItem.getByRole("button", { name: /excluir/i }));

    expect(onCopyLink).toHaveBeenCalledWith(rooms[1]);
    expect(onEdit).toHaveBeenCalledWith(rooms[1]);
    expect(onDelete).toHaveBeenCalledWith(rooms[1]);
  });
});
