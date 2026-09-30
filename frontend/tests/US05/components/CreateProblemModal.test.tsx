import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProblemModal } from "@/components/features/problems/CreateProblemModal";
import { TITLE_VALIDATION_MESSAGE } from "../fixtures";

function renderModal() {
  const onSubmit = vi.fn<(title: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<CreateProblemModal onSubmit={onSubmit} onClose={onClose} />);

  return {
    user,
    onSubmit,
    onClose,
    titleInput: screen.getByLabelText(/título/i),
    createButton: screen.getByRole("button", { name: /^criar$/i }),
  };
}

describe("[US05] CreateProblemModal", () => {
  it("should submit the typed title and close when the title is valid", async () => {
    const { user, onSubmit, onClose, titleInput, createButton } = renderModal();

    await user.type(titleInput, "Problem 1");
    await user.click(createButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Problem 1");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("should block creation when the title is blank", async () => {
    const { user, onSubmit, onClose, titleInput, createButton } = renderModal();

    await user.type(titleInput, "   ");
    await user.click(createButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(TITLE_VALIDATION_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
