import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateRoomModal } from "@/components/features/rooms/CreateRoomModal";
import { NAME_VALIDATION_MESSAGE } from "../fixtures";

function renderModal() {
  const onSubmit = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<CreateRoomModal onSubmit={onSubmit} onClose={onClose} />);

  return {
    user,
    onSubmit,
    onClose,
    nameInput: screen.getByLabelText(/nome da sala/i),
    createButton: screen.getByRole("button", { name: /^criar$/i }),
  };
}

describe("[US03] CreateRoomModal", () => {
  it("should submit the typed name and close when the name is valid", async () => {
    const { user, onSubmit, onClose, nameInput, createButton } = renderModal();

    await user.type(nameInput, "Software Engineering Module");
    await user.click(createButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Software Engineering Module");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("[QA] should block creation when the name has fewer than 3 characters", async () => {
    const { user, onSubmit, onClose, nameInput, createButton } = renderModal();

    await user.type(nameInput, "AB");
    await user.click(createButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(NAME_VALIDATION_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("should accept a name with exactly 3 characters", async () => {
    const { user, onSubmit, nameInput, createButton } = renderModal();

    await user.type(nameInput, "ABC");
    await user.click(createButton);

    expect(onSubmit).toHaveBeenCalledWith("ABC");
  });

  it("should block creation when the name has more than 100 characters", async () => {
    const { user, onSubmit, nameInput, createButton } = renderModal();

    // fireEvent contorna um eventual maxLength, para testar a regra de validação e não o atributo HTML
    fireEvent.change(nameInput, { target: { value: "A".repeat(101) } });
    await user.click(createButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(NAME_VALIDATION_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
