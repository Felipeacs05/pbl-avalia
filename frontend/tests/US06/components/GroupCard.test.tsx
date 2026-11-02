import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupCard } from "@/components/features/groups/GroupCard";
import { makeGroup, makeOtherStudent, makeStudent } from "../fixtures";

function renderCard(canManage = true) {
  const group = makeGroup({ members: [makeStudent(), makeOtherStudent()] });
  const callbacks = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddMember: vi.fn(),
    onRemoveMember: vi.fn(),
  };
  const user = userEvent.setup();

  render(<GroupCard group={group} canManage={canManage} {...callbacks} />);

  return { group, user, ...callbacks };
}

describe("[US06] GroupCard", () => {
  it("should display the group name and all its members", () => {
    const { group } = renderCard();

    expect(screen.getByRole("region", { name: group.name })).toBeInTheDocument();
    group.members.forEach((member) => {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    });
  });

  it("should trigger only onEdit from the 'Editar' button", async () => {
    const { user, onEdit, onDelete, onAddMember, onRemoveMember } = renderCard();

    await user.click(screen.getByRole("button", { name: /editar/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onAddMember).not.toHaveBeenCalled();
    expect(onRemoveMember).not.toHaveBeenCalled();
  });

  it("should trigger only onDelete from the 'Excluir' button", async () => {
    const { user, onEdit, onDelete, onAddMember, onRemoveMember } = renderCard();

    await user.click(screen.getByRole("button", { name: /excluir/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onAddMember).not.toHaveBeenCalled();
    expect(onRemoveMember).not.toHaveBeenCalled();
  });

  it("should trigger only onAddMember from the 'Adicionar aluno' button", async () => {
    const { user, onEdit, onDelete, onAddMember, onRemoveMember } = renderCard();

    await user.click(screen.getByRole("button", { name: /adicionar aluno/i }));

    expect(onAddMember).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onRemoveMember).not.toHaveBeenCalled();
  });

  it("should trigger only onRemoveMember with the clicked student", async () => {
    const { user, onEdit, onDelete, onAddMember, onRemoveMember } = renderCard();

    await user.click(screen.getByRole("button", { name: /remover bruno lima/i }));

    expect(onRemoveMember).toHaveBeenCalledTimes(1);
    expect(onRemoveMember).toHaveBeenCalledWith(makeOtherStudent());
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onAddMember).not.toHaveBeenCalled();
  });

  it("should show the members without any management action when the viewer is not the Tutor", () => {
    const { group } = renderCard(false);

    group.members.forEach((member) => {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
