import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRegistration } from "@/hooks/useRegistration";
import { registrationService } from "@/services/registrationService";
import {
  API_ERROR_TEXT,
  DEFAULT_ERROR_TEXT,
  FIVE_MB,
  FIVE_MB_PLUS_ONE,
  IMAGE_SIZE_LIMIT_TEXT,
  makeApiError,
  makeImageFile,
  PASSWORD_MISMATCH_TEXT,
  REQUIRED_FIELDS_TEXT,
  SUCCESS_TEXT,
} from "../fixtures";

// Mock local de navegação para capturar o push
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock do service de cadastro
vi.mock("@/services/registrationService", () => ({
  registrationService: {
    createAccount: vi.fn(),
  },
}));

const service = vi.mocked(registrationService);

/**
 * Promessa controlada para observar o estado in-flight (loading = true)
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createSyntheticSubmitEvent(): React.SyntheticEvent {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SyntheticEvent;
}

describe("[US01] useRegistration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Deve iniciar com todos os campos vazios, sem foto, sem toast e com loading falso", () => {
    const { result } = renderHook(() => useRegistration());

    // Estado inicial padrão do formulário
    expect(result.current.name).toBe("");
    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.confirmPassword).toBe("");
    expect(result.current.image).toBeNull();
    expect(result.current.toast).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("Deve exibir toast 'Preencha todos os campos obrigatórios.' quando qualquer campo obrigatório estiver vazio", async () => {
    const { result } = renderHook(() => useRegistration());

    // Submete com todos os campos vazios
    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // O toast de erro de obrigatoriedade deve ser exibido e o serviço não deve ser chamado
    expect(result.current.toast).toEqual({
      message: REQUIRED_FIELDS_TEXT,
      type: "error",
    });
    expect(service.createAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    // Preenche nome e e-mail, mas deixa a senha vazia
    act(() => {
      result.current.setName("João");
      result.current.setEmail("joao@uefs.br");
    });
    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });
    expect(result.current.toast).toEqual({
      message: REQUIRED_FIELDS_TEXT,
      type: "error",
    });
    expect(service.createAccount).not.toHaveBeenCalled();
  });

  it("Deve exibir toast 'As senhas não coincidem.' quando a confirmação de senha divergir da senha informada", async () => {
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.setName("João da Silva");
      result.current.setEmail("joao@uefs.br");
      result.current.setPassword("SenhaCorreta@123");
      result.current.setConfirmPassword("SenhaDiferente@999");
    });

    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // As senhas divergentes devem ser bloqueadas no frontend antes de tocar no serviço
    expect(result.current.toast).toEqual({
      message: PASSWORD_MISMATCH_TEXT,
      type: "error",
    });
    expect(service.createAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("Deve aceitar arquivo de imagem que atinja o limite máximo permitido de exatamente 5MB", () => {
    const { result } = renderHook(() => useRegistration());
    const valid5MbFile = makeImageFile(FIVE_MB, "image/png", "avatar-5mb.png");

    const mockEvent = {
      target: {
        files: [valid5MbFile],
        value: "C:\\fakepath\\avatar-5mb.png",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageChange(mockEvent);
    });

    // Arquivo no limiar superior de 5MB deve ser mantido no estado
    expect(result.current.image).toBe(valid5MbFile);
    expect(result.current.toast).toBeNull();
  });

  it("[QA] Deve recusar imagem que exceda o limite de 5MB (5MB + 1 byte), exibir toast e zerar o input de arquivo", () => {
    const { result } = renderHook(() => useRegistration());
    const oversizedFile = makeImageFile(FIVE_MB_PLUS_ONE, "image/jpeg", "avatar-grande.jpeg");

    const mockEvent = {
      target: {
        files: [oversizedFile],
        value: "C:\\fakepath\\avatar-grande.jpeg",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageChange(mockEvent);
    });

    // O arquivo acima de 5MB não pode ser aceito, a referência de imagem deve ser nula e o valor do input resetado
    expect(result.current.image).toBeNull();
    expect(mockEvent.target.value).toBe("");
    expect(result.current.toast).toEqual({
      message: IMAGE_SIZE_LIMIT_TEXT,
      type: "error",
    });
  });

  it("Deve prosseguir com o cadastro normalmente sem foto de perfil (foto opcional)", async () => {
    service.createAccount.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.setName("Ana Pereira");
      result.current.setEmail("ana@uefs.br");
      result.current.setPassword("Senha@123");
      result.current.setConfirmPassword("Senha@123");
      // Foto intencionalmente não selecionada (permanece null)
    });

    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // Valida que o cadastro é disparado mesmo com image=null
    expect(service.createAccount).toHaveBeenCalledTimes(1);
    expect(service.createAccount).toHaveBeenCalledWith({
      name: "Ana Pereira",
      email: "ana@uefs.br",
      password: "Senha@123",
      image: null,
    });
    expect(result.current.toast).toEqual({
      message: SUCCESS_TEXT,
      type: "success",
    });
  });

  it("Deve exibir toast de sucesso e disparar router.push('/') após exatamente 2000 ms", async () => {
    service.createAccount.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.setName("Lucas Moura");
      result.current.setEmail("lucas@uefs.br");
      result.current.setPassword("Senha@123");
      result.current.setConfirmPassword("Senha@123");
    });

    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // Toast de sucesso imediato
    expect(result.current.toast).toEqual({
      message: SUCCESS_TEXT,
      type: "success",
    });

    // Antes de 2000 ms, o redirecionamento ainda não pode ter ocorrido
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // Ao completar os 2000 ms, router.push("/") deve ser chamado
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("Deve exibir a mensagem de erro específica da API quando response.data.message estiver presente", async () => {
    service.createAccount.mockRejectedValue(makeApiError(API_ERROR_TEXT, 409));
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.setName("Carlos");
      result.current.setEmail("carlos@uefs.br");
      result.current.setPassword("Senha@123");
      result.current.setConfirmPassword("Senha@123");
    });

    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // Mensagem de erro retornada pelo backend tem precedência sobre mensagens padrão
    expect(result.current.toast).toEqual({
      message: API_ERROR_TEXT,
      type: "error",
    });
  });

  it("[QA] Deve exibir mensagem padrão de erro quando a API rejeitar a requisição sem payload explicativo", async () => {
    service.createAccount.mockRejectedValue(new Error("Erro de infraestrutura"));
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.setName("Carlos");
      result.current.setEmail("carlos@uefs.br");
      result.current.setPassword("Senha@123");
      result.current.setConfirmPassword("Senha@123");
    });

    await act(async () => {
      await result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // Fallback amigável para falhas inesperadas
    expect(result.current.toast).toEqual({
      message: DEFAULT_ERROR_TEXT,
      type: "error",
    });
  });

  it("Deve alternar loading para true durante o envio e garantir que volte a false no bloco finally", async () => {
    const pending = deferred<void>();
    service.createAccount.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useRegistration());

    act(() => {
      result.current.setName("Mariana");
      result.current.setEmail("mariana@uefs.br");
      result.current.setPassword("Senha@123");
      result.current.setConfirmPassword("Senha@123");
    });

    // Dispara a submissão sem aguardar a resolução da promessa
    act(() => {
      void result.current.handleSubmit(createSyntheticSubmitEvent());
    });

    // Durante o envio, loading deve estar ativo
    expect(result.current.loading).toBe(true);

    // Rejeição da promessa
    await act(async () => {
      pending.reject(new Error("Erro"));
    });

    // Mesmo com erro, o finally deve garantir que loading volte para false
    expect(result.current.loading).toBe(false);
  });
});
