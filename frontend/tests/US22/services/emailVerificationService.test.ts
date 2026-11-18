import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { api } from "@/services/api";
import { emailVerificationService } from "@/services/emailVerificationService";
import {
  ALREADY_VERIFIED_TEXT,
  EXPIRED_CODE,
  INVALID_CODE_TEXT,
  makeResendResponse,
  makeVerifyResponse,
  PENDING_EMAIL,
  RESEND_VERIFICATION_ROUTE,
  VALID_CODE,
  VERIFY_EMAIL_ROUTE,
} from "../fixtures";

// Camada de SERVICE: só fala HTTP. A camada abaixo (instância axios) é simulada;
// o interceptor e o baseURL /api/v1 são testados em apiInterceptor.test.ts
vi.mock("@/services/api", () => ({
  api: { post: vi.fn() },
}));

const mockedApi = vi.mocked(api);

function axiosHttpError(status: number, data: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = { status, statusText: "", data, headers: {}, config } as AxiosResponse;
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("[US22] emailVerificationService", () => {
  // --- VERIFICAÇÃO DO CÓDIGO ---

  it("Deve fazer uma única chamada POST /auth/verify-email com e-mail e código e devolver o corpo do backend", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: makeVerifyResponse() });

    await expect(emailVerificationService.verifyEmail(PENDING_EMAIL, VALID_CODE)).resolves.toEqual(
      makeVerifyResponse(),
    );

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith(VERIFY_EMAIL_ROUTE, { email: PENDING_EMAIL, code: VALID_CODE });
  });

  // Fluxo "expirado (403)" da QA e código digitado errado (400): o service só repassa status e texto
  it.each([
    ["inválido", 400],
    ["expirado", 403],
  ])("Deve rejeitar com { status, message } do backend quando o código está %s", async (_case, status) => {
    mockedApi.post.mockRejectedValueOnce(axiosHttpError(status, { status, error: "Error", message: INVALID_CODE_TEXT }));

    await expect(emailVerificationService.verifyEmail(PENDING_EMAIL, EXPIRED_CODE)).rejects.toEqual({
      status,
      message: INVALID_CODE_TEXT,
    });
  });

  it("Deve usar o campo error do corpo quando o backend não envia message", async () => {
    mockedApi.post.mockRejectedValueOnce(axiosHttpError(400, { error: INVALID_CODE_TEXT }));

    await expect(emailVerificationService.verifyEmail(PENDING_EMAIL, EXPIRED_CODE)).rejects.toEqual({
      status: 400,
      message: INVALID_CODE_TEXT,
    });
  });

  it("Deve rejeitar com uma mensagem padrão não vazia quando o backend responde sem corpo", async () => {
    mockedApi.post.mockRejectedValueOnce(axiosHttpError(500, ""));

    const error = await emailVerificationService.verifyEmail(PENDING_EMAIL, VALID_CODE).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 500, message: expect.any(String) });
    expect((error as { message: string }).message.trim()).not.toBe("");
  });

  it("Deve rejeitar com status 0 quando não há resposta do servidor (falha de rede)", async () => {
    mockedApi.post.mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"));

    const error = await emailVerificationService.verifyEmail(PENDING_EMAIL, VALID_CODE).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 0, message: expect.any(String) });
    expect((error as { message: string }).message.trim()).not.toBe("");
  });

  // --- REENVIO ---

  it("Deve fazer uma única chamada POST /auth/resend-verification com o e-mail e devolver o corpo do backend", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: makeResendResponse() });

    await expect(emailVerificationService.resendVerification(PENDING_EMAIL)).resolves.toEqual(makeResendResponse());

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith(RESEND_VERIFICATION_ROUTE, { email: PENDING_EMAIL });
  });

  it("Deve rejeitar o reenvio com { status, message } quando o backend recusa", async () => {
    mockedApi.post.mockRejectedValueOnce(axiosHttpError(409, { status: 409, error: "Conflict", message: ALREADY_VERIFIED_TEXT }));

    await expect(emailVerificationService.resendVerification(PENDING_EMAIL)).rejects.toEqual({
      status: 409,
      message: ALREADY_VERIFIED_TEXT,
    });
  });
});
