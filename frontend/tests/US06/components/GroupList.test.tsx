import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupList } from "@/components/features/groups/GroupList";
import { makeGroup, makeOtherGroup, makeStudent } from "../fixtures";

function renderList() {
  const groups = [makeOtherGroup(), makeGroup()];
  const callbacks = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddMember: vi.fn(),
    onRemoveMember: vi.fn(),
  };
  const user = userEvent.setup();

  render(<GroupList groups={groups} canManage {...callbacks} />);

  return { groups, user, ...callbacks };
}

describe("[US06] GroupList", () => {
  it("should render one card per group", () => {
    const { groups } = renderList();

    expect(screen.getAllByRole("region")).toHaveLength(groups.length);
    groups.forEach((group) => {
      expect(screen.getByRole("region", { name: group.name })).toBeInTheDocument();
    });
  });

  it("should pass the clicked group to each action", async () => {
    const { groups, user, onEdit, onDelete, onAddMember, onRemoveMember } = renderList();
    const secondCard = within(screen.getByRole("region", { name: groups[1].name }));

    await user.click(secondCard.getByRole("button", { name: /editar/i }));
    await user.click(secondCard.getByRole("button", { name: /excluir/i }));
    await user.click(secondCard.getByRole("button", { name: /adicionar aluno/i }));
    await user.click(secondCard.getByRole("button", { name: /remover alice souza/i }));

    expect(onEdit).toHaveBeenCalledWith(groups[1]);
    expect(onDelete).toHaveBeenCalledWith(groups[1]);
    expect(onAddMember).toHaveBeenCalledWith(groups[1]);
    expect(onRemoveMember).toHaveBeenCalledWith(groups[1], makeStudent());
  });
});
