import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyEmailForm } from "@/components/features/email-verification/VerifyEmailForm";
import { INVALID_CODE_TEXT, PENDING_EMAIL, RESEND_TEXT, VALID_CODE, VERIFY_SUCCESS_TEXT } from "../fixtures";

// Camada de UI (apresentação): sem hook nem service. Recebe estado por props e devolve ações por callbacks.
type FormProps = {
  isSubmitting?: boolean;
  successMessage?: string | null;
  error?: string | null;
};

function renderForm({ isSubmitting = false, successMessage = null, error = null }: FormProps = {}) {
  const onVerify = vi.fn<(code: string) => Promise<void>>().mockResolvedValue(undefined);
  const onResend = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(
    <VerifyEmailForm
      email={PENDING_EMAIL}
      isSubmitting={isSubmitting}
      successMessage={successMessage}
      error={error}
      onVerify={onVerify}
      onResend={onResend}
    />,
  );

  return {
    user,
    onVerify,
    onResend,
    codeInput: screen.getByLabelText(/código/i),
    verifyButton: screen.getByRole("button", { name: /^(verificar|confirmar)/i }),
    resendButton: screen.getByRole("button", { name: /reenviar e-mail/i }),
  };
}

describe("[US22] VerifyEmailForm", () => {
  it("Deve exibir o e-mail para o qual o código foi enviado", () => {
    renderForm();

    expect(document.body).toHaveTextContent(PENDING_EMAIL);
  });

  // --- VERIFICAÇÃO ---

  it("Deve enviar o código digitado ao clicar em verificar", async () => {
    const { user, onVerify, onResend, codeInput, verifyButton } = renderForm();

    await user.type(codeInput, VALID_CODE);
    await user.click(verifyButton);

    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith(VALID_CODE);
    expect(onResend).not.toHaveBeenCalled();
  });

  it("Deve enviar o código ao pressionar Enter no campo", async () => {
    const { user, onVerify, codeInput } = renderForm();

    await user.type(codeInput, `${VALID_CODE}{Enter}`);

    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith(VALID_CODE);
  });

  it("Deve remover espaços antes e depois do código colado", async () => {
    const { user, onVerify, codeInput, verifyButton } = renderForm();

    await user.click(codeInput);
    await user.paste(`  ${VALID_CODE}  `);
    await user.click(verifyButton);

    expect(onVerify).toHaveBeenCalledWith(VALID_CODE);
  });

  it.each([
    ["vazio", ""],
    ["só com espaços", "   "],
  ])("Não deve chamar a verificação com o código %s", async (_case, typed) => {
    const { user, onVerify, codeInput, verifyButton } = renderForm();

    if (typed) await user.type(codeInput, typed);
    await user.click(verifyButton);

    expect(onVerify).not.toHaveBeenCalled();
  });

  // --- REENVIO ---

  it("Deve pedir o reenvio ao clicar em 'Reenviar e-mail' sem disparar a verificação", async () => {
    const { user, onVerify, onResend, codeInput, resendButton } = renderForm();

    // Mesmo com código preenchido, o botão de reenvio não pode submeter o formulário
    await user.type(codeInput, VALID_CODE);
    await user.click(resendButton);

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(onVerify).not.toHaveBeenCalled();
  });

  // --- FEEDBACK ---

  it("Deve exibir o erro do backend em um alerta quando o código é inválido ou expirado", () => {
    renderForm({ error: INVALID_CODE_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(INVALID_CODE_TEXT);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([
    ["verificação", VERIFY_SUCCESS_TEXT],
    ["reenvio", RESEND_TEXT],
  ])("Deve exibir a mensagem de sucesso da %s exatamente como o backend devolve", (_case, message) => {
    renderForm({ successMessage: message });

    expect(screen.getByRole("status").textContent?.trim()).toBe(message);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Não deve exibir alerta nem status quando não há mensagens", () => {
    renderForm();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Deve desabilitar verificar e reenviar enquanto há envio em andamento", async () => {
    const { user, onVerify, onResend, codeInput, verifyButton, resendButton } = renderForm({ isSubmitting: true });

    expect(verifyButton).toBeDisabled();
    expect(resendButton).toBeDisabled();

    await user.type(codeInput, `${VALID_CODE}{Enter}`);
    expect(onVerify).not.toHaveBeenCalled();
    expect(onResend).not.toHaveBeenCalled();
  });
});
