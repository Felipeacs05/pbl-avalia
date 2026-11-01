import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginAuth } from "@/components/features/auth/LoginAuth";
import { authService } from "@/services/authService";
import {
  authMockSuccess,
  INVALID_CREDENTIALS_TEXT,
  LOGIN_BUTTON_LOADING_TEXT,
  LOGIN_BUTTON_TEXT,
  makeAxiosError,
  REGISTER_LINK_TEXT,
} from "../fixtures";

// Mock do authService para controlar chamadas e promessas de autenticação
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

function renderLoginAuth() {
  const user = userEvent.setup();
  render(<LoginAuth />);

  return {
    user,
    emailInput: screen.getByLabelText("E-mail"),
    passwordInput: screen.getByLabelText("Senha"),
    submitButton: screen.getByRole("button", { name: LOGIN_BUTTON_TEXT }),
    registerLink: screen.getByRole("link", { name: REGISTER_LINK_TEXT }),
  };
}

describe("[US02] LoginAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Deve renderizar os campos de e-mail e senha com o atributo required", () => {
    const { emailInput, passwordInput } = renderLoginAuth();

    // Campos obrigatórios impedem submissão em branco
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toBeRequired();

    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toBeRequired();
  });

  it("Deve renderizar o botão com o texto 'Entrar' habilitado no estado inicial", () => {
    const { submitButton } = renderLoginAuth();

    // Botão pronto para receber clique inicial do usuário
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
    expect(submitButton).toBeEnabled();
  });

  it("Deve exibir 'Entrando...' e desabilitar os campos e o botão durante o estado de carregamento (isLoading)", async () => {
    const pending = deferred<typeof authMockSuccess>();
    service.login.mockReturnValue(pending.promise);

    const { user, emailInput, passwordInput, submitButton } = renderLoginAuth();

    await user.type(emailInput, "marlus@uefs.br");
    await user.type(passwordInput, "123456");
    await user.click(submitButton);

    // O botão deve alternar o texto para "Entrando..." e ficar desabilitado
    const loadingButton = screen.getByRole("button", { name: LOGIN_BUTTON_LOADING_TEXT });
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();

    // Campos de entrada devem ser travados durante a autenticação
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();

    // Após resolver a requisição, o botão deve voltar ao estado ativo
    pending.resolve(authMockSuccess);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: LOGIN_BUTTON_TEXT })).toBeEnabled();
    });
  });

  it("Deve exibir banner de erro com role='alert' quando houver falha de autenticação", async () => {
    service.login.mockRejectedValue(makeAxiosError(401, INVALID_CREDENTIALS_TEXT));

    const { user, emailInput, passwordInput, submitButton } = renderLoginAuth();

    await user.type(emailInput, "usuario@uefs.br");
    await user.type(passwordInput, "senhaIncorreta");
    await user.click(submitButton);

    // Acessibilidade: tecnologias assistivas devem receber o anúncio de erro via role="alert"
    const alertBox = await screen.findByRole("alert");
    expect(alertBox).toHaveTextContent(INVALID_CREDENTIALS_TEXT);
  });

  it("Deve renderizar o link 'Cadastre-se' apontando para '/register'", () => {
    const { registerLink } = renderLoginAuth();

    // Link para permitir que novos usuários acessem o fluxo da US01
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  it("Deve invocar preventDefault na submissão do formulário para evitar recarregamento da página", () => {
    renderLoginAuth();

    const form = screen.getByRole("button", { name: LOGIN_BUTTON_TEXT }).closest("form")!;
    const submitEvent = new Event("submit", { cancelable: true, bubbles: true });
    const preventDefaultSpy = vi.spyOn(submitEvent, "preventDefault");

    fireEvent(form, submitEvent);

    // Garante que o SPA não realize refresh completo do navegador
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("[QA] Deve aplicar área de toque de no mínimo 44x44 pixels (min-h-11) no botão de login", () => {
    const { submitButton } = renderLoginAuth();

    // Diretriz de touch target mobile (WCAG 2.5.5 / 2.5.8)
    expect(submitButton.className).toMatch(/(^|\s)min-h-(11|\[44px\])(\s|$)/);
  });
});
