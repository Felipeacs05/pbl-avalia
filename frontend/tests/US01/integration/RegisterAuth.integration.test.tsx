import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterAuth } from "@/components/features/auth/RegisterAuth";
import { registrationService } from "@/services/registrationService";
import type { RegistrationData } from "@/types/registration";
import {
  API_ERROR_MESSAGE,
  API_ERROR_TEXT,
  IMAGE_SUCCESS_MESSAGE,
  makeApiError,
  makeImageFile,
  SUBMIT_BUTTON_LOADING_TEXT,
  SUBMIT_BUTTON_TEXT,
  SUCCESS_MESSAGE,
  XSS_NAME_PAYLOAD,
} from "../fixtures";

// Mock do service para fornecer controle preciso de timing via deferred promise
vi.mock("@/services/registrationService", () => ({
  registrationService: {
    createAccount: vi.fn(),
  },
}));

const service = vi.mocked(registrationService);

// Estado simulado do backend em memória para atender ao padrão de testes de integração
let registeredUsers: RegistrationData[];
let heldResponses: Array<() => void>;
let networkIsSlow: boolean;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function throttled(init: RequestInit, respond: () => Response): Promise<Response> {
  return new Promise((resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    heldResponses.push(() => resolve(respond()));
  });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = init.method ?? "GET";

  if (method === "POST" && url.includes("/auth/register")) {
    const respond = () => {
      // Criação fake de usuário no backend em memória
      return jsonResponse({ message: "Cadastro realizado com sucesso." }, 201);
    };
    return networkIsSlow ? throttled(init, respond) : Promise.resolve(respond());
  }

  return Promise.resolve(jsonResponse({ message: "Not Found" }, 404));
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({
      url: String(url),
      body: init?.body ? String(init.body) : undefined,
    }));
}

function releaseHeldResponses() {
  const current = [...heldResponses];
  heldResponses = [];
  current.forEach((resolve) => resolve());
}

/**
 * Promessa controlada para testar o atraso e a transição do estado visual
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

describe("[US01] RegisterAuth Integration", () => {
  beforeEach(() => {
    registeredUsers = [];
    heldResponses = [];
    networkIsSlow = false;
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
  });

  it("Deve completar o fluxo de cadastro sem foto com sucesso, exibindo estado de carregamento e toast de sucesso", async () => {
    const pending = deferred<void>();
    service.createAccount.mockImplementation(async (data: RegistrationData) => {
      registeredUsers.push(data);
      await pending.promise;
    });

    const user = userEvent.setup();
    render(<RegisterAuth />);

    const nameInput = screen.getByLabelText("Nome Completo");
    const emailInput = screen.getByLabelText("E-mail");
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText("Confirme sua senha");
    const submitButton = screen.getByRole("button", { name: SUBMIT_BUTTON_TEXT });

    // Preenche o formulário sem anexar imagem (foto opcional)
    await user.type(nameInput, "João da Silva");
    await user.type(emailInput, "joao.silva@uefs.br");
    await user.type(passwordInput, "SenhaSegura@2026");
    await user.type(confirmPasswordInput, "SenhaSegura@2026");

    // Submete o formulário
    await user.click(submitButton);

    // Durante o envio atrasado, verifica que o botão exibe o estado de loading e fica desabilitado
    expect(screen.getByRole("button", { name: SUBMIT_BUTTON_LOADING_TEXT })).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();

    // Libera a resposta do serviço
    pending.resolve();

    // Toast de sucesso deve ser exibido após a confirmação
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();

    // Valida que o payload enviado ao serviço contém image = null
    expect(registeredUsers).toHaveLength(1);
    expect(registeredUsers[0]).toEqual({
      name: "João da Silva",
      email: "joao.silva@uefs.br",
      password: "SenhaSegura@2026",
      image: null,
    });
  });

  it("[QA] Deve sanitizar entrada XSS no nome, tratando '<script>alert(1)</script>' como texto puro e sem injetar elemento script no DOM", async () => {
    const pending = deferred<void>();
    service.createAccount.mockImplementation(async (data: RegistrationData) => {
      registeredUsers.push(data);
      await pending.promise;
    });

    const user = userEvent.setup();
    render(<RegisterAuth />);

    const nameInput = screen.getByLabelText("Nome Completo") as HTMLInputElement;
    const emailInput = screen.getByLabelText("E-mail");
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText("Confirme sua senha");
    const submitButton = screen.getByRole("button", { name: SUBMIT_BUTTON_TEXT });

    // Injeta payload malicioso de script no campo de nome
    await user.type(nameInput, XSS_NAME_PAYLOAD);
    await user.type(emailInput, "seguranca@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "Senha@123");

    // O valor do input deve ser a string literal, sem interpretação HTML
    expect(nameInput.value).toBe(XSS_NAME_PAYLOAD);

    // Garante que nenhum elemento script foi injetado ou executado no DOM
    const injectedScripts = document.querySelectorAll("script:not([data-testid])");
    expect(injectedScripts.length).toBe(0);

    await user.click(submitButton);
    pending.resolve();

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();

    // O serviço recebe o texto exatamente como digitado para ser sanitizado/escapado pelo backend
    expect(registeredUsers[0].name).toBe(XSS_NAME_PAYLOAD);
  });

  it("Deve completar o fluxo de cadastro com upload de foto válida (PNG até 5MB)", async () => {
    service.createAccount.mockImplementation(async (data: RegistrationData) => {
      registeredUsers.push(data);
    });

    const user = userEvent.setup();
    render(<RegisterAuth />);

    const validPhoto = makeImageFile(1024 * 50, "image/png", "perfil-valido.png");
    const imageInput = screen.getByLabelText(/foto de perfil/i);

    await user.type(screen.getByLabelText("Nome Completo"), "Beatriz Lima");
    await user.type(screen.getByLabelText("E-mail"), "beatriz@uefs.br");
    await user.type(screen.getByLabelText(/^senha$/i), "Senha@123");
    await user.type(screen.getByLabelText("Confirme sua senha"), "Senha@123");

    // Seleciona a foto
    await user.upload(imageInput, validPhoto);

    // Valida o feedback visual imediato de imagem selecionada
    expect(screen.getByText(IMAGE_SUCCESS_MESSAGE)).toBeInTheDocument();

    // Submete o cadastro
    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON_TEXT }));

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();

    // Valida que a foto foi transmitida no objeto de registro
    expect(registeredUsers).toHaveLength(1);
    expect(registeredUsers[0].image).toBe(validPhoto);
  });

  it("[QA] Deve reabilitar o formulário e permitir nova tentativa quando a API retornar erro de validação", async () => {
    service.createAccount.mockRejectedValue(makeApiError(API_ERROR_TEXT, 409));

    const user = userEvent.setup();
    render(<RegisterAuth />);

    const nameInput = screen.getByLabelText("Nome Completo");
    const emailInput = screen.getByLabelText("E-mail");
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const confirmPasswordInput = screen.getByLabelText("Confirme sua senha");
    const submitButton = screen.getByRole("button", { name: SUBMIT_BUTTON_TEXT });

    await user.type(nameInput, "Marcos");
    await user.type(emailInput, "duplicado@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "Senha@123");

    await user.click(submitButton);

    // Erro exibido na tela
    expect(await screen.findByText(API_ERROR_MESSAGE)).toBeInTheDocument();

    // Após o erro, os campos e o botão devem estar novamente habilitados para correção
    expect(submitButton).toBeEnabled();
    expect(emailInput).toBeEnabled();
    expect(nameInput).toBeEnabled();
  });
});
