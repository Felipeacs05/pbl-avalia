import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import {
  authMockSuccess,
  DEFAULT_ERROR_TEXT,
  INVALID_CREDENTIALS_TEXT,
  makeAuthResponse,
  makeAxiosError,
  makeLoginCredentials,
} from "../fixtures";

// Mock de navegação do Next
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock do authService
vi.mock("@/services/authService", () => ({
  authService: {
    login: vi.fn(),
  },
}));

const service = vi.mocked(authService);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("[US02] useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("Deve iniciar com estado limpo: isLoading falso e error nulo", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("Deve gravar o token no localStorage e redirecionar para '/teacher-rooms' em caso de login bem-sucedido", async () => {
    const successResponse = makeAuthResponse();
    service.login.mockResolvedValue(successResponse);

    const { result } = renderHook(() => useAuth());
    const credentials = makeLoginCredentials();

    await act(async () => {
      await result.current.login(credentials);
    });

    // Token JWT deve estar salvo no localStorage para autenticar requisições futuras
    expect(localStorage.getItem("token")).toBe(successResponse.token);

    // O hook deve direcionar o usuário autenticado para a listagem de salas de professor
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/teacher-rooms");

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("Deve definir a mensagem de erro vinda de response.data.message quando a API rejeitar o login", async () => {
    service.login.mockRejectedValue(makeAxiosError(401, INVALID_CREDENTIALS_TEXT));

    const { result } = renderHook(() => useAuth());
    const credentials = makeLoginCredentials({ password: "senhaIncorreta" });

    await act(async () => {
      await result.current.login(credentials);
    });

    // Mensagem de erro da API exposta no estado do hook
    expect(result.current.error).toBe(INVALID_CREDENTIALS_TEXT);

    // Nenhum token pode ser persistido em caso de falha
    expect(localStorage.getItem("token")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("[QA] Deve aplicar mensagem de erro genérica padrão quando a resposta da API não trouxer response.data.message", async () => {
    service.login.mockRejectedValue(new Error("Falha de rede ou timeout"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login(makeLoginCredentials());
    });

    // Fallback amigável para indisponibilidade do backend
    expect(result.current.error).toBe(DEFAULT_ERROR_TEXT);
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("Deve limpar a mensagem de erro anterior a cada nova tentativa de submissão", async () => {
    service.login.mockRejectedValueOnce(makeAxiosError(401, INVALID_CREDENTIALS_TEXT));

    const { result } = renderHook(() => useAuth());

    // 1ª tentativa falha
    await act(async () => {
      await result.current.login(makeLoginCredentials({ password: "errada" }));
    });
    expect(result.current.error).toBe(INVALID_CREDENTIALS_TEXT);

    // 2ª tentativa pendente: verifica se error foi zerado imediatamente no início da chamada
    const pending = deferred<typeof authMockSuccess>();
    service.login.mockReturnValueOnce(pending.promise);

    act(() => {
      void result.current.login(makeLoginCredentials());
    });

    // O erro antigo deve ser limpo imediatamente para dar feedback de nova tentativa
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      pending.resolve(authMockSuccess);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("Deve manter isLoading como true durante a chamada e garantir retorno a false no finally", async () => {
    const pending = deferred<typeof authMockSuccess>();
    service.login.mockReturnValue(pending.promise);

    const { result } = renderHook(() => useAuth());

    act(() => {
      void result.current.login(makeLoginCredentials());
    });

    // Estado in-flight
    expect(result.current.isLoading).toBe(true);

    // Resolução com erro
    await act(async () => {
      pending.reject(makeAxiosError(500, "Erro interno"));
    });

    // O finally deve sempre desativar o isLoading
    expect(result.current.isLoading).toBe(false);
  });

  it("Deve remover o token do localStorage e redirecionar para '/' ao chamar a função logout", () => {
    localStorage.setItem("token", "jwt-token-ativo");

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    // Sessão encerrada: token excluído do cliente
    expect(localStorage.getItem("token")).toBeNull();

    // Redirecionamento para a página inicial de autenticação
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
