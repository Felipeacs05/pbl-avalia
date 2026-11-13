import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyEmailPanel } from "@/components/features/email-verification/VerifyEmailPanel";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import {
  INVALID_CODE_TEXT,
  PENDING_EMAIL,
  PENDING_USER,
  PENDING_USER_TOKEN,
  VALID_CODE,
  VERIFY_SUCCESS_TEXT,
} from "../fixtures";

// Camada de UI (container): só liga o hook ao formulário. O hook é simulado;
// o e-mail vem do usuário logado (o interceptor manda para cá quem já está logado e pendente)
vi.mock("@/hooks/useEmailVerification", () => ({
  useEmailVerification: vi.fn(),
}));

const mockedHook = vi.mocked(useEmailVerification);

type HookState = ReturnType<typeof useEmailVerification>;

function mockHookState(overrides: Partial<HookState> = {}) {
  const state = {
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    resendVerification: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    successMessage: null,
    error: null,
    ...overrides,
  } as HookState;
  mockedHook.mockReturnValue(state);
  return state;
}

describe("[US22] VerifyEmailPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", PENDING_USER_TOKEN);
    localStorage.setItem("user", JSON.stringify(PENDING_USER));
  });

  it("Deve mostrar o e-mail do usuário logado como destino do código", () => {
    mockHookState();
    render(<VerifyEmailPanel />);

    expect(document.body).toHaveTextContent(PENDING_EMAIL);
  });

  it("Deve verificar o código digitado usando o e-mail do usuário logado", async () => {
    const state = mockHookState();
    const user = userEvent.setup();
    render(<VerifyEmailPanel />);

    await user.type(screen.getByLabelText(/código/i), VALID_CODE);
    await user.click(screen.getByRole("button", { name: /^(verificar|confirmar)/i }));

    expect(state.verifyEmail).toHaveBeenCalledTimes(1);
    expect(state.verifyEmail).toHaveBeenCalledWith(PENDING_EMAIL, VALID_CODE);
    expect(state.resendVerification).not.toHaveBeenCalled();
  });

  it("Deve pedir o reenvio para o e-mail do usuário logado", async () => {
    const state = mockHookState();
    const user = userEvent.setup();
    render(<VerifyEmailPanel />);

    await user.click(screen.getByRole("button", { name: /reenviar e-mail/i }));

    expect(state.resendVerification).toHaveBeenCalledTimes(1);
    expect(state.resendVerification).toHaveBeenCalledWith(PENDING_EMAIL);
    expect(state.verifyEmail).not.toHaveBeenCalled();
  });

  it("Deve repassar ao formulário o erro exposto pelo hook", () => {
    mockHookState({ error: INVALID_CODE_TEXT });
    render(<VerifyEmailPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent(INVALID_CODE_TEXT);
  });

  it("Deve repassar ao formulário a mensagem de sucesso exposta pelo hook", () => {
    mockHookState({ successMessage: VERIFY_SUCCESS_TEXT });
    render(<VerifyEmailPanel />);

    expect(screen.getByRole("status").textContent?.trim()).toBe(VERIFY_SUCCESS_TEXT);
  });

  it("Deve repassar ao formulário o envio em andamento", () => {
    mockHookState({ isSubmitting: true });
    render(<VerifyEmailPanel />);

    expect(screen.getByRole("button", { name: /^(verificar|confirmar)/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reenviar e-mail/i })).toBeDisabled();
  });
});
