import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";
import { passwordRecoveryService } from "@/services/passwordRecoveryService";
import {
  INVALID_TOKEN_MESSAGE,
  makeInvalidTokenError,
  makeRecoveryResponse,
  makeResetResponse,
  NEW_PASSWORD,
  RECOVERY_TEXT,
  REGISTERED_EMAIL,
  RESET_SUCCESS_TEXT,
  RESET_TOKEN,
  UNREGISTERED_EMAIL,
} from "../fixtures";

vi.mock("@/services/passwordRecoveryService", () => ({
  passwordRecoveryService: { requestRecovery: vi.fn(), resetPassword: vi.fn() },
}));

const service = vi.mocked(passwordRecoveryService);

describe("[US21] usePasswordRecovery", () => {
  // --- SOLICITAÇÃO DO LINK ---

  // %s em vez de $campo: string interpolada com $ sai entre aspas no título
  it.each([
    ["cadastrado", REGISTERED_EMAIL],
    ["não cadastrado", UNREGISTERED_EMAIL],
  ])("Deve encaminhar o e-mail ao service e expor a mesma confirmação para e-mail %s", async (_case, email) => {
    // O backend responde igual nos dois casos; o hook não pode criar diferença nenhuma
    service.requestRecovery.mockResolvedValue(makeRecoveryResponse());
    const { result } = renderHook(() => usePasswordRecovery());

    await act(async () => {
      await result.current.requestRecovery(email);
    });

    expect(service.requestRecovery).toHaveBeenCalledTimes(1);
    expect(service.requestRecovery).toHaveBeenCalledWith(email);
    expect(result.current.successMessage).toBe(RECOVERY_TEXT);
    expect(result.current.error).toBeNull();
  });

  // --- REDEFINIÇÃO ---

  it("Deve encaminhar o token e a nova senha ao service e expor a mensagem de sucesso", async () => {
    service.resetPassword.mockResolvedValue(makeResetResponse());
    const { result } = renderHook(() => usePasswordRecovery());

    await act(async () => {
      await result.current.resetPassword(RESET_TOKEN, NEW_PASSWORD);
    });

    expect(service.resetPassword).toHaveBeenCalledTimes(1);
    expect(service.resetPassword).toHaveBeenCalledWith(RESET_TOKEN, NEW_PASSWORD);
    expect(result.current.successMessage).toBe(RESET_SUCCESS_TEXT);
    expect(result.current.error).toBeNull();
  });

  it("Deve expor a mensagem do token inválido sem sucesso e limpá-la na próxima redefinição bem-sucedida", async () => {
    service.resetPassword.mockRejectedValueOnce(makeInvalidTokenError()).mockResolvedValueOnce(makeResetResponse());
    const { result } = renderHook(() => usePasswordRecovery());

    // A rejeição é capturada pelo hook: a chamada não pode propagar o erro para a tela
    await act(async () => {
      await result.current.resetPassword(RESET_TOKEN, NEW_PASSWORD);
    });

    expect(result.current.error).toMatch(INVALID_TOKEN_MESSAGE);
    expect(result.current.successMessage).toBeNull();

    await act(async () => {
      await result.current.resetPassword(RESET_TOKEN, NEW_PASSWORD);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBe(RESET_SUCCESS_TEXT);
  });
});
