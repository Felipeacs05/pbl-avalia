import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { AxiosError, InternalAxiosRequestConfig } from "axios";
import { RATE_LIMIT_TEXT, VALID_JWT_TOKEN } from "../fixtures";

describe("[US02] api interceptors", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock do window.location para capturar redirecionamentos em ambiente jsdom
    delete (window as unknown as { location: unknown }).location;
    window.location = {
      href: "http://localhost:3000/teacher-rooms",
    } as unknown as Location;
  });

  afterEach(() => {
    localStorage.clear();
    window.location = originalLocation;
  });

  it("Deve injetar o cabeçalho 'Authorization: Bearer <token>' na requisição quando houver token no localStorage", async () => {
    localStorage.setItem("token", VALID_JWT_TOKEN);

    let capturedConfig: InternalAxiosRequestConfig | null = null;

    // Configura adapter mockado para inspecionar a configuração processada pelos interceptors
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    await api.get("/rooms");

    // Validação da injeção do JWT
    expect(capturedConfig).not.toBeNull();
    const authorization = capturedConfig?.headers?.Authorization;
    expect(authorization).toBe(`Bearer ${VALID_JWT_TOKEN}`);
  });

  it("Não deve injetar o cabeçalho Authorization quando não houver token no localStorage", async () => {
    localStorage.removeItem("token");

    let capturedConfig: InternalAxiosRequestConfig | null = null;

    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    await api.get("/public-info");

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig?.headers?.Authorization).toBeUndefined();
  });

  it("Deve remover o token do localStorage e redirecionar window.location para '/' quando a API retornar 401 (token expirado/inválido)", async () => {
    localStorage.setItem("token", VALID_JWT_TOKEN);

    api.defaults.adapter = async (config) => {
      const error = new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Token inválido ou expirado" },
        headers: {},
        config,
      });
      return Promise.reject(error);
    };

    await expect(api.get("/protected")).rejects.toThrow();

    // Interceptor de 401 deve limpar a sessão e redirecionar para a raiz de login
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/");
  });

  it("Deve sobrescrever data.message com o aviso amigável de bloqueio temporário quando a API retornar 429 (Too Many Requests)", async () => {
    api.defaults.adapter = async (config) => {
      const error = new AxiosError("Too Many Requests", "ERR_BAD_REQUEST", config, null, {
        status: 429,
        statusText: "Too Many Requests",
        data: { message: "Original server rate limit reached" },
        headers: {},
        config,
      });
      return Promise.reject(error);
    };

    let caughtError: AxiosError | null = null;
    try {
      await api.get("/endpoint");
    } catch (err: unknown) {
      caughtError = err as AxiosError<{ message: string }>;
    }

    // Valida que o interceptor alterou a mensagem para o padrão amigável do sistema
    expect(caughtError).not.toBeNull();
    expect(caughtError?.response?.data?.message).toBe(RATE_LIMIT_TEXT);
  });

  it("[QA] Deve propagar outros erros (ex: 500 Internal Server Error) intactos sem alterar data.message nem limpar o token", async () => {
    localStorage.setItem("token", VALID_JWT_TOKEN);
    const originalErrorMessage = "Falha no banco de dados";

    api.defaults.adapter = async (config) => {
      const error = new AxiosError("Internal Server Error", "ERR_INTERNAL", config, null, {
        status: 500,
        statusText: "Internal Server Error",
        data: { message: originalErrorMessage },
        headers: {},
        config,
      });
      return Promise.reject(error);
    };

    let caughtError: AxiosError | null = null;
    try {
      await api.get("/rooms");
    } catch (err: unknown) {
      caughtError = err as AxiosError<{ message: string }>;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.response?.status).toBe(500);
    expect(caughtError?.response?.data?.message).toBe(originalErrorMessage);
    // Token deve permanecer preservado para erros não relacionados a autenticação
    expect(localStorage.getItem("token")).toBe(VALID_JWT_TOKEN);
    expect(window.location.href).not.toBe("/");
  });
});
