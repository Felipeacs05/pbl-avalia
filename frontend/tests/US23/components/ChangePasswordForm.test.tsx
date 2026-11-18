import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "@/components/features/profile/ChangePasswordForm";
import { CURRENT_PASSWORD, NEW_PASSWORD, PASSWORD_CHANGED_TEXT, WRONG_CURRENT_PASSWORD_TEXT } from "../fixtures";

// Camada de UI (apresentação): troca de senha com confirmação da senha atual.

type FormProps = { isSubmitting?: boolean; successMessage?: string | null; error?: string | null };

function renderForm({ isSubmitting = false, successMessage = null, error = null }: FormProps = {}) {
  const onSubmit = vi.fn<(current: string, next: string) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<ChangePasswordForm isSubmitting={isSubmitting} successMessage={successMessage} error={error} onSubmit={onSubmit} />);
  return {
    user,
    onSubmit,
    currentInput: () => screen.getByLabelText(/senha atual/i),
    newInput: () => screen.getByLabelText(/nova senha/i),
    submitButton: () => screen.getByRole("button", { name: /alterar senha/i }),
  };
}

describe("[US23] ChangePasswordForm", () => {
  it("Deve pedir a senha atual e a nova senha em campos mascarados", () => {
    const { currentInput, newInput } = renderForm();

    expect(currentInput()).toHaveAttribute("type", "password");
    expect(newInput()).toHaveAttribute("type", "password");
    expect(screen.getByRole("form", { name: /senha/i })).toBeInTheDocument();
  });

  it("Deve enviar a senha atual e a nova exatamente como digitadas", async () => {
    const { user, onSubmit, currentInput, newInput, submitButton } = renderForm();

    await user.type(currentInput(), CURRENT_PASSWORD);
    await user.type(newInput(), NEW_PASSWORD);
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(CURRENT_PASSWORD, NEW_PASSWORD);
  });

  it.each([
    ["sem a senha atual (a US exige a confirmação da senha anterior)", "", NEW_PASSWORD],
    ["sem a nova senha", CURRENT_PASSWORD, ""],
  ])("Não deve enviar %s", async (_case, current, next) => {
    const { user, onSubmit, currentInput, newInput, submitButton } = renderForm();

    if (current) await user.type(currentInput(), current);
    if (next) await user.type(newInput(), next);
    await user.click(submitButton());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // --- SENHA ATUAL INCORRETA ---

  it("Deve exibir em alerta o erro de senha atual incorreta exatamente como o backend devolve", () => {
    renderForm({ error: WRONG_CURRENT_PASSWORD_TEXT });

    expect(screen.getByRole("alert").textContent?.trim()).toBe(WRONG_CURRENT_PASSWORD_TEXT);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Deve exibir a confirmação de senha alterada", () => {
    renderForm({ successMessage: PASSWORD_CHANGED_TEXT });

    expect(screen.getByRole("status").textContent?.trim()).toBe(PASSWORD_CHANGED_TEXT);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve desabilitar o envio enquanto a troca está em andamento", async () => {
    const { user, onSubmit, currentInput, newInput, submitButton } = renderForm({ isSubmitting: true });

    expect(submitButton()).toBeDisabled();
    await user.type(currentInput(), CURRENT_PASSWORD);
    await user.type(newInput(), `${NEW_PASSWORD}{Enter}`);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
