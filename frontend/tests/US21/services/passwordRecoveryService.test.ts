import { beforeEach, describe, expect, it, vi } from "vitest";
import { passwordRecoveryService } from "@/services/passwordRecoveryService";
import {
  BACKEND_INVALID_TOKEN_BODY,
  INVALID_TOKEN_TEXT,
  makeRecoveryResponse,
  makeResetResponse,
  NEW_PASSWORD,
  REGISTERED_EMAIL,
  RESET_TOKEN,
} from "../fixtures";

// Rotas do teste de backend da US21 (sem o prefixo /api/v1)
const RECOVER_ROUTE = /\/api\/auth\/password\/recover$/;
const RESET_ROUTE = /\/api\/auth\/password\/reset$/;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init ?? {} };
}

function sentBody(init: RequestInit): unknown {
  return JSON.parse(String(init.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US21] passwordRecoveryService", () => {
  // --- SOLICITAÇÃO DO LINK ---

  it("Deve fazer POST do e-mail na rota de recuperação e devolver a mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeRecoveryResponse(), 200));

    await expect(passwordRecoveryService.requestRecovery(REGISTERED_EMAIL)).resolves.toEqual(makeRecoveryResponse());

    // Uma única chamada: o front não pode consultar antes se o e-mail existe
    const { url, init } = singleFetchCall();
    expect(url).toMatch(RECOVER_ROUTE);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ email: REGISTERED_EMAIL });
  });

  // --- REDEFINIÇÃO ---

  it("Deve fazer POST do token e da nova senha na rota de redefinição e devolver a mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeResetResponse(), 200));

    await expect(passwordRecoveryService.resetPassword(RESET_TOKEN, NEW_PASSWORD)).resolves.toEqual(
      makeResetResponse(),
    );

    const { url, init } = singleFetchCall();
    expect(url).toMatch(RESET_ROUTE);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ token: RESET_TOKEN, newPassword: NEW_PASSWORD });
  });

  it("Deve rejeitar com 400 e a mensagem do campo error quando o token é inválido ou expirado", async () => {
    // Token usado e token expirado recebem do backend o mesmo 400 com o mesmo corpo
    vi.mocked(fetch).mockResolvedValue(jsonResponse(BACKEND_INVALID_TOKEN_BODY, 400));

    await expect(passwordRecoveryService.resetPassword(RESET_TOKEN, NEW_PASSWORD)).rejects.toEqual({
      status: 400,
      message: INVALID_TOKEN_TEXT,
    });
    singleFetchCall();
  });
});
