import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateGroupModal } from "@/components/features/groups/CreateGroupModal";

function renderModal() {
  const onSubmit = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<CreateGroupModal onSubmit={onSubmit} onClose={onClose} />);

  return {
    user,
    onSubmit,
    onClose,
    nameInput: screen.getByLabelText(/nome do grupo/i),
    createButton: screen.getByRole("button", { name: /^criar$/i }),
  };
}

describe("[US06] CreateGroupModal", () => {
  it("should submit the typed name and close", async () => {
    const { user, onSubmit, onClose, nameInput, createButton } = renderModal();

    await user.type(nameInput, "Group 1");
    await user.click(createButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Group 1");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
