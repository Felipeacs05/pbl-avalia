import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useChangePassword } from "@/hooks/useChangePassword";
import { profileService } from "@/services/profileService";
import {
  CURRENT_PASSWORD,
  LOGIN_PAGE,
  makeUnauthorizedError,
  makeWrongPasswordError,
  MAX_REDIRECT_DELAY_MS,
  NEW_PASSWORD,
  PASSWORD_CHANGED_TEXT,
  STORED_TOKEN,
  STORED_USER,
  storedUser,
  storeSession,
  WRONG_CURRENT_PASSWORD_TEXT,
  WRONG_PASSWORD,
} from "../fixtures";

// Camada de HOOK: estado do formulário de senha, sessão e navegação. O service é simulado.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/services/profileService", () => ({
  profileService: { updateProfile: vi.fn(), changePassword: vi.fn() },
}));

const service = vi.mocked(profileService);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("[US23] useChangePassword", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockReset();
    localStorage.clear();
    storeSession();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  function passRedirectWindow() {
    act(() => {
      vi.advanceTimersByTime(MAX_REDIRECT_DELAY_MS);
    });
  }

  it("Deve começar sem envio em andamento e sem mensagens", () => {
    const { result } = renderHook(() => useChangePassword());

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // --- SENHA ATUAL INCORRETA ---

  it("Deve expor exatamente o erro do backend quando a senha atual está incorreta, sem propagar", async () => {
    service.changePassword.mockRejectedValue(makeWrongPasswordError());
    const { result } = renderHook(() => useChangePassword());

    // Se a rejeição escapar do hook, este await falha o teste
    await act(async () => {
      await result.current.changePassword(WRONG_PASSWORD, NEW_PASSWORD);
    });

    expect(service.changePassword).toHaveBeenCalledWith({ currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD });
    expect(result.current.error).toBe(WRONG_CURRENT_PASSWORD_TEXT);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("Deve manter a sessão e a tela quando a senha atual está incorreta", async () => {
    service.changePassword.mockRejectedValue(makeWrongPasswordError());
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(WRONG_PASSWORD, NEW_PASSWORD);
    });
    passRedirectWindow();

    // A senha não mudou no backend: o token continua válido
    expect(localStorage.getItem("token")).toBe(STORED_TOKEN);
    expect(storedUser()).toEqual(STORED_USER);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Deve permitir corrigir a senha atual: o erro anterior some quando a nova tentativa dá certo", async () => {
    service.changePassword
      .mockRejectedValueOnce(makeWrongPasswordError())
      .mockResolvedValueOnce({ message: PASSWORD_CHANGED_TEXT });
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(WRONG_PASSWORD, NEW_PASSWORD);
    });
    expect(result.current.error).toBe(WRONG_CURRENT_PASSWORD_TEXT);

    await act(async () => {
      await result.current.changePassword(CURRENT_PASSWORD, NEW_PASSWORD);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBe(PASSWORD_CHANGED_TEXT);
  });

  // --- SUCESSO E REVOGAÇÃO DA SESSÃO ---

  it("Deve encaminhar a senha atual e a nova ao service e expor a mensagem de sucesso do backend", async () => {
    service.changePassword.mockResolvedValue({ message: PASSWORD_CHANGED_TEXT });
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(CURRENT_PASSWORD, NEW_PASSWORD);
    });

    expect(service.changePassword).toHaveBeenCalledTimes(1);
    expect(service.changePassword).toHaveBeenCalledWith({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD });
    expect(result.current.successMessage).toBe(PASSWORD_CHANGED_TEXT);
    expect(result.current.error).toBeNull();
  });

  it("Deve encerrar a sessão e levar ao login após a troca, pois o backend revoga o token atual", async () => {
    service.changePassword.mockResolvedValue({ message: PASSWORD_CHANGED_TEXT });
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(CURRENT_PASSWORD, NEW_PASSWORD);
    });
    passRedirectWindow();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(LOGIN_PAGE);
  });

  it("Deve encerrar a sessão e levar ao login quando o token já foi revogado (401), sem confundir com senha errada", async () => {
    service.changePassword.mockRejectedValue(makeUnauthorizedError());
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(CURRENT_PASSWORD, NEW_PASSWORD);
    });
    passRedirectWindow();

    expect(result.current.error).not.toBe(WRONG_CURRENT_PASSWORD_TEXT);
    expect(localStorage.getItem("token")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith(LOGIN_PAGE);
  });

  // --- VALIDAÇÕES ANTES DE CHAMAR O BACKEND ---

  it.each([
    ["senha atual vazia", "", NEW_PASSWORD],
    ["nova senha vazia", CURRENT_PASSWORD, ""],
    ["nova senha só com espaços", CURRENT_PASSWORD, "   "],
  ])("Não deve chamar o service com %s", async (_case, current, next) => {
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(current, next);
    });

    expect(service.changePassword).not.toHaveBeenCalled();
    expect(result.current.error?.trim()).toBeTruthy();
  });

  it("Não deve chamar o service quando a nova senha é igual à atual (o backend também recusa)", async () => {
    const { result } = renderHook(() => useChangePassword());

    await act(async () => {
      await result.current.changePassword(CURRENT_PASSWORD, CURRENT_PASSWORD);
    });

    expect(service.changePassword).not.toHaveBeenCalled();
    expect(result.current.error?.trim()).toBeTruthy();
    expect(localStorage.getItem("token")).toBe(STORED_TOKEN);
  });

  it("Deve manter isSubmitting verdadeiro enquanto a troca está pendente", async () => {
    const pending = deferred<{ message: string }>();
    service.changePassword.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useChangePassword());

    let call!: Promise<void>;
    act(() => {
      call = result.current.changePassword(CURRENT_PASSWORD, NEW_PASSWORD);
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      pending.resolve({ message: PASSWORD_CHANGED_TEXT });
      await call;
    });
    expect(result.current.isSubmitting).toBe(false);
  });
});
