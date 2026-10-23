import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditGroupModal } from "@/components/features/groups/EditGroupModal";
import { makeGroup } from "../fixtures";

function renderModal() {
  const onSubmit = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<EditGroupModal group={makeGroup()} onSubmit={onSubmit} onClose={onClose} />);

  return {
    user,
    onSubmit,
    onClose,
    nameInput: screen.getByLabelText(/nome do grupo/i),
    saveButton: screen.getByRole("button", { name: /salvar/i }),
  };
}

describe("[US06] EditGroupModal", () => {
  it("should submit the new name and close", async () => {
    const { user, onSubmit, onClose, nameInput, saveButton } = renderModal();

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Group");
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Updated Group");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
