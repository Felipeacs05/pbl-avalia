import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "@/components/features/password-recovery/ForgotPasswordForm";
import { RECOVERY_TEXT, REGISTERED_EMAIL } from "../fixtures";

function renderForm({ successMessage = null as string | null } = {}) {
  const onSubmit = vi.fn<(email: string) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();

  const { rerender } = render(<ForgotPasswordForm successMessage={successMessage} onSubmit={onSubmit} />);

  return {
    user,
    onSubmit,
    rerender,
    emailInput: screen.getByLabelText(/e-mail/i),
    sendButton: screen.getByRole("button", { name: /enviar link/i }),
  };
}

describe("[US21] ForgotPasswordForm", () => {
  it("Deve enviar o e-mail digitado ao solicitar o link de redefinição", async () => {
    const { user, onSubmit, emailInput, sendButton } = renderForm();

    await user.type(emailInput, REGISTERED_EMAIL);
    await user.click(sendButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(REGISTERED_EMAIL);
  });

  it("Deve exibir a confirmação exatamente como o backend a devolve, sem indicar se o e-mail existe", async () => {
    const { user, onSubmit, rerender, emailInput, sendButton } = renderForm();

    await user.type(emailInput, REGISTERED_EMAIL);
    await user.click(sendButton);
    rerender(<ForgotPasswordForm successMessage={RECOVERY_TEXT} onSubmit={onSubmit} />);

    // Texto idêntico ao do backend: qualquer variação montada no front poderia revelar a conta
    // Igualdade, e não toHaveTextContent: este só confere se o texto está contido
    expect(screen.getByRole("status").textContent?.trim()).toBe(RECOVERY_TEXT);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
