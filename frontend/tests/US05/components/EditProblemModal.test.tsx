import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditProblemModal } from "@/components/features/problems/EditProblemModal";
import { makeProblem, TITLE_VALIDATION_MESSAGE } from "../fixtures";

function renderModal() {
  const onSubmit = vi.fn<(title: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<EditProblemModal problem={makeProblem()} onSubmit={onSubmit} onClose={onClose} />);

  return {
    user,
    onSubmit,
    onClose,
    titleInput: screen.getByLabelText(/título/i),
    saveButton: screen.getByRole("button", { name: /salvar/i }),
  };
}

describe("[US05] EditProblemModal", () => {
  it("should start with the current title and submit the new title, then close", async () => {
    const { user, onSubmit, onClose, titleInput, saveButton } = renderModal();

    expect(titleInput).toHaveValue(makeProblem().title);

    await user.clear(titleInput);
    await user.type(titleInput, "Problem 1 - Revised");
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Problem 1 - Revised");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("should block editing when the new title is blank", async () => {
    const { user, onSubmit, onClose, titleInput, saveButton } = renderModal();

    await user.clear(titleInput);
    await user.type(titleInput, "   ");
    await user.click(saveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(TITLE_VALIDATION_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
