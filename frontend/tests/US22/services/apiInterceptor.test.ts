import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import { api } from "@/services/api";
import {
  FORBIDDEN_TEXT,
  makeGenericForbiddenBody,
  makeNotVerifiedBody,
  mockWindowLocation,
  NOT_VERIFIED_TEXT,
  PENDING_USER_TOKEN,
  VERIFY_EMAIL_PAGE,
} from "../fixtures";

const STARTING_HREF = "http://localhost:3000/teacher-rooms";

function rejectWith(status: number, data: unknown): AxiosAdapter {
  return async (config) => {
    const response = { status, statusText: "", data, headers: {}, config } as AxiosResponse;
    throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
  };
}

async function caughtError(request: Promise<unknown>): Promise<AxiosError<{ message?: string }>> {
  try {
    await request;
  } catch (err) {
    return err as AxiosError<{ message?: string }>;
  }
  throw new Error("A requisição deveria ter sido rejeitada");
}

describe("[US22] api (axios) — interceptor de usuário pendente de verificação", () => {
  const originalAdapter = api.defaults.adapter;
  let restoreLocation: () => void;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", PENDING_USER_TOKEN);
    restoreLocation = mockWindowLocation(STARTING_HREF);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    restoreLocation();
    localStorage.clear();
  });

  it("Deve redirecionar para /verify-email quando a API responde 403 com o código de e-mail não verificado", async () => {
    api.defaults.adapter = rejectWith(403, makeNotVerifiedBody());

    await caughtError(api.post("/rooms", { name: "Sala A" }));

    expect(window.location.href).toMatch(VERIFY_EMAIL_PAGE);
  });

  it("Deve continuar rejeitando a requisição com o 403 original para quem chamou", async () => {
    api.defaults.adapter = rejectWith(403, makeNotVerifiedBody());

    const error = await caughtError(api.post("/rooms/join", { accessCode: "ABC123" }));

    expect(error.response?.status).toBe(403);
    expect(error.response?.data?.message).toBe(NOT_VERIFIED_TEXT);
  });

  it("Não deve encerrar a sessão do usuário pendente (diferente do 401)", async () => {
    api.defaults.adapter = rejectWith(403, makeNotVerifiedBody());

    await caughtError(api.post("/rooms", { name: "Sala A" }));

    // O usuário continua logado: só precisa confirmar o e-mail
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
  });

  it("Não deve redirecionar em um 403 comum, sem o código de e-mail não verificado", async () => {
    api.defaults.adapter = rejectWith(403, makeGenericForbiddenBody());

    const error = await caughtError(api.post("/rooms", { name: "Sala A" }));

    expect(window.location.href).toBe(STARTING_HREF);
    expect(error.response?.status).toBe(403);
    expect(error.response?.data?.message).toBe(FORBIDDEN_TEXT);
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
  });

  it("Não deve redirecionar em um 403 sem corpo", async () => {
    api.defaults.adapter = rejectWith(403, "");

    await caughtError(api.post("/rooms", { name: "Sala A" }));

    expect(window.location.href).toBe(STARTING_HREF);
  });

  it("Não deve redirecionar quando o usuário já está em /verify-email (evita recarregar e perder a mensagem de erro)", async () => {
    restoreLocation();
    restoreLocation = mockWindowLocation("http://localhost:3000/verify-email");
    // O próprio /auth/verify-email pode responder 403 de pendente enquanto a conta não é confirmada
    api.defaults.adapter = rejectWith(403, makeNotVerifiedBody());

    const error = await caughtError(api.post("/auth/verify-email", { email: "joao@uefs.br", code: "000000" }));

    expect(window.location.href).toBe("http://localhost:3000/verify-email");
    expect(error.response?.status).toBe(403);
  });

  it("Deve manter o tratamento do 401 da US02 (limpa a sessão e volta ao login), sem desviar para /verify-email", async () => {
    api.defaults.adapter = rejectWith(401, { message: "Token inválido ou expirado" });

    await caughtError(api.post("/rooms", { name: "Sala A" }));

    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/");
  });

  it("Não deve redirecionar quando a resposta é de sucesso", async () => {
    api.defaults.adapter = async (config) => ({ data: { id: "1" }, status: 201, statusText: "", headers: {}, config });

    await api.post("/rooms", { name: "Sala A" });

    expect(window.location.href).toBe(STARTING_HREF);
  });
});
