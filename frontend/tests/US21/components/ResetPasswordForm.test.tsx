import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetPasswordForm } from "@/components/features/password-recovery/ResetPasswordForm";
import {
  INVALID_TOKEN_MESSAGE,
  INVALID_TOKEN_TEXT,
  NEW_PASSWORD,
  RESET_SUCCESS_MESSAGE,
  RESET_SUCCESS_TEXT,
  RESET_TOKEN,
} from "../fixtures";

function renderForm({ successMessage = null as string | null, error = null as string | null } = {}) {
  const onSubmit = vi.fn<(token: string, newPassword: string) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(<ResetPasswordForm token={RESET_TOKEN} successMessage={successMessage} error={error} onSubmit={onSubmit} />);

  return { user, onSubmit };
}

describe("[US21] ResetPasswordForm", () => {
  it("Deve enviar o token recebido no link junto com a nova senha digitada", async () => {
    const { user, onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/nova senha/i), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(RESET_TOKEN, NEW_PASSWORD);
  });

  it("Deve exibir o sucesso, levar ao login e não oferecer novo envio quando a senha é redefinida", () => {
    renderForm({ successMessage: RESET_SUCCESS_TEXT });

    expect(screen.getByRole("status")).toHaveTextContent(RESET_SUCCESS_MESSAGE);
    // As sessões anteriores foram invalidadas no backend: o caminho é entrar de novo
    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute("href", "/");
    // O token é de uso único: depois do sucesso não há o que reenviar
    expect(screen.queryByRole("button", { name: /redefinir senha/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve exibir em alerta a recusa do token usado ou expirado", () => {
    renderForm({ error: INVALID_TOKEN_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(INVALID_TOKEN_MESSAGE);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
