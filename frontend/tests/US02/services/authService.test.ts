import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/authService";
import { api } from "@/services/api";
import {
  authMockSuccess,
  INVALID_CREDENTIALS_MESSAGE,
  makeInvalidCredentials,
  makeLoginCredentials,
} from "../fixtures";

// Mock da instância do axios para testar o caminho de API real
vi.mock("@/services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe("[US02] authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Deve resolver com o token mock após exatamente 1000 ms quando a senha for '123456' no caminho de simulação", async () => {
    vi.useFakeTimers();
    const credentials = makeLoginCredentials({ password: "123456" });

    let resolved = false;
    let authResult: unknown = null;

    const promise = authService.login(credentials, true).then((res) => {
      resolved = true;
      authResult = res;
    });

    // Antes de 1000 ms a requisição simulada permanece pendente
    await vi.advanceTimersByTimeAsync(999);
    expect(resolved).toBe(false);

    // Ao atingir 1000 ms a promessa resolve
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
    await promise;

    expect(authResult).toEqual(authMockSuccess);
  });

  it("Deve rejeitar no formato response.data.message quando a senha for incorreta no caminho de simulação", async () => {
    vi.useFakeTimers();
    const credentials = makeInvalidCredentials();

    let rejected = false;
    let errorResult: { response?: { data?: { message?: string } } } | null = null;

    const promise = authService.login(credentials, true).catch((err: unknown) => {
      rejected = true;
      errorResult = err as { response?: { data?: { message?: string } } };
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(rejected).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(rejected).toBe(true);
    await promise;

    // Formato de erro axios tratado pelo useAuth
    expect(errorResult?.response?.data?.message).toBeDefined();
    expect(errorResult?.response?.data?.message).toMatch(INVALID_CREDENTIALS_MESSAGE);
  });

  it("Deve enviar requisição POST /auth/login com as credenciais via @/services/api no caminho de API real (useMock = false)", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: authMockSuccess });
    const credentials = makeLoginCredentials();

    const result = await authService.login(credentials, false);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/login", credentials);
    expect(result).toEqual(authMockSuccess);
  });

  it("[QA] Deve validar que a mensagem de erro é genérica ('Credenciais inválidas') sem revelar se o e-mail existe no sistema", async () => {
    vi.useFakeTimers();
    const credentialsWithUnknownEmail = {
      email: "email.inexistente@uefs.br",
      password: "qualquerSenha",
    };

    let errorResult: { response?: { data?: { message?: string } } } | null = null;
    const promise = authService.login(credentialsWithUnknownEmail, true).catch((err: unknown) => {
      errorResult = err as { response?: { data?: { message?: string } } };
    });

    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    // Regra de segurança do PRD: não expor enumeração de usuários (user enumeration)
    const message = errorResult?.response?.data?.message ?? "";
    expect(message).toMatch(INVALID_CREDENTIALS_MESSAGE);
    expect(message.toLowerCase()).not.toContain("e-mail não encontrado");
    expect(message.toLowerCase()).not.toContain("usuário inexistente");
  });
});
