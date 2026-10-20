import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditRoomModal } from "@/components/features/rooms/EditRoomModal";
import { makeRoom, NAME_VALIDATION_MESSAGE } from "../fixtures";

function renderModal() {
  const onSubmit = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<EditRoomModal room={makeRoom()} onSubmit={onSubmit} onClose={onClose} />);

  return {
    user,
    onSubmit,
    onClose,
    nameInput: screen.getByLabelText(/nome da sala/i),
    saveButton: screen.getByRole("button", { name: /salvar/i }),
  };
}

describe("[US03] EditRoomModal", () => {
  it("should submit the new name and close when the name is valid", async () => {
    const { user, onSubmit, onClose, nameInput, saveButton } = renderModal();

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Module");
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Updated Module");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("should block editing when the new name has fewer than 3 characters", async () => {
    const { user, onSubmit, onClose, nameInput, saveButton } = renderModal();

    await user.clear(nameInput);
    await user.type(nameInput, "AB");
    await user.click(saveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(NAME_VALIDATION_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
