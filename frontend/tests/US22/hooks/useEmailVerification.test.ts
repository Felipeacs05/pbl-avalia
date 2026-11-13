import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { emailVerificationService } from "@/services/emailVerificationService";
import {
  AFTER_VERIFY_ROUTE,
  ALREADY_VERIFIED_TEXT,
  EXPIRED_CODE,
  INVALID_CODE_MESSAGE,
  makeExpiredCodeError,
  makeResendResponse,
  makeVerifyResponse,
  MAX_REDIRECT_DELAY_MS,
  PENDING_EMAIL,
  RESEND_TEXT,
  VALID_CODE,
  VERIFY_SUCCESS_TEXT,
} from "../fixtures";

// Camada de HOOK: estado da tela e navegação. A camada abaixo (service) é simulada.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/services/emailVerificationService", () => ({
  emailVerificationService: { verifyEmail: vi.fn(), resendVerification: vi.fn() },
}));

const service = vi.mocked(emailVerificationService);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("[US22] useEmailVerification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function passRedirectWindow() {
    act(() => {
      vi.advanceTimersByTime(MAX_REDIRECT_DELAY_MS);
    });
  }

  it("Deve começar sem envio em andamento e sem mensagens", () => {
    const { result } = renderHook(() => useEmailVerification());

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // --- VERIFICAÇÃO (objetivo da US: confirmar a conta e liberar as salas) ---

  it("Deve encaminhar e-mail e código ao service e expor a mensagem de sucesso do backend", async () => {
    service.verifyEmail.mockResolvedValue(makeVerifyResponse());
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, VALID_CODE);
    });

    expect(service.verifyEmail).toHaveBeenCalledTimes(1);
    expect(service.verifyEmail).toHaveBeenCalledWith(PENDING_EMAIL, VALID_CODE);
    expect(result.current.successMessage).toBe(VERIFY_SUCCESS_TEXT);
    expect(result.current.error).toBeNull();
  });

  it("Deve levar o usuário de volta às salas depois de confirmar o e-mail", async () => {
    service.verifyEmail.mockResolvedValue(makeVerifyResponse());
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, VALID_CODE);
    });
    passRedirectWindow();

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(AFTER_VERIFY_ROUTE);
  });

  it("Deve capturar o erro de código expirado (403) sem propagar e sem sair da tela", async () => {
    service.verifyEmail.mockRejectedValue(makeExpiredCodeError());
    const { result } = renderHook(() => useEmailVerification());

    // Se a rejeição escapar do hook, este await falha o teste
    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, EXPIRED_CODE);
    });
    passRedirectWindow();

    expect(result.current.error).toMatch(INVALID_CODE_MESSAGE);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Deve expor uma mensagem padrão quando o erro não traz message", async () => {
    service.verifyEmail.mockRejectedValue({ status: 500 });
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, VALID_CODE);
    });

    expect(typeof result.current.error).toBe("string");
    expect(result.current.error?.trim()).not.toBe("");
  });

  it("Deve limpar o erro anterior quando a próxima verificação for bem-sucedida", async () => {
    service.verifyEmail.mockRejectedValueOnce(makeExpiredCodeError()).mockResolvedValueOnce(makeVerifyResponse());
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, EXPIRED_CODE);
    });
    expect(result.current.error).toMatch(INVALID_CODE_MESSAGE);

    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, VALID_CODE);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBe(VERIFY_SUCCESS_TEXT);
  });

  it("Deve manter isSubmitting verdadeiro enquanto a verificação está pendente", async () => {
    const pending = deferred<{ message: string }>();
    service.verifyEmail.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useEmailVerification());

    let call!: Promise<void>;
    act(() => {
      call = result.current.verifyEmail(PENDING_EMAIL, VALID_CODE);
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      pending.resolve(makeVerifyResponse());
      await call;
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  // --- REENVIO ---

  it("Deve encaminhar o e-mail ao service de reenvio, expor a confirmação e continuar na tela", async () => {
    service.resendVerification.mockResolvedValue(makeResendResponse());
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.resendVerification(PENDING_EMAIL);
    });
    passRedirectWindow();

    expect(service.resendVerification).toHaveBeenCalledTimes(1);
    expect(service.resendVerification).toHaveBeenCalledWith(PENDING_EMAIL);
    expect(service.verifyEmail).not.toHaveBeenCalled();
    expect(result.current.successMessage).toBe(RESEND_TEXT);
    expect(result.current.error).toBeNull();
    // Reenviar não confirma a conta: o usuário precisa digitar o novo código
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Deve limpar o erro de código expirado ao reenviar um novo código com sucesso", async () => {
    service.verifyEmail.mockRejectedValue(makeExpiredCodeError());
    service.resendVerification.mockResolvedValue(makeResendResponse());
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.verifyEmail(PENDING_EMAIL, EXPIRED_CODE);
    });
    await act(async () => {
      await result.current.resendVerification(PENDING_EMAIL);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBe(RESEND_TEXT);
  });

  it("Deve expor o erro do backend quando o reenvio falha", async () => {
    service.resendVerification.mockRejectedValue({ status: 409, message: ALREADY_VERIFIED_TEXT });
    const { result } = renderHook(() => useEmailVerification());

    await act(async () => {
      await result.current.resendVerification(PENDING_EMAIL);
    });

    expect(result.current.error).toBe(ALREADY_VERIFIED_TEXT);
    expect(result.current.successMessage).toBeNull();
  });
});
