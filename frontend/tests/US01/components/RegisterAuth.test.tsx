import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterAuth } from "@/components/features/auth/RegisterAuth";
import { registrationService } from "@/services/registrationService";
import {
  API_ERROR_MESSAGE,
  API_ERROR_TEXT,
  IMAGE_SUCCESS_MESSAGE,
  LOGIN_LINK_TEXT,
  makeApiError,
  makeImageFile,
  PASSWORD_MISMATCH_MESSAGE,
  SUBMIT_BUTTON_LOADING_TEXT,
  SUBMIT_BUTTON_TEXT,
  SUCCESS_MESSAGE,
} from "../fixtures";

// Mock do serviço de cadastro para controle de promessas e inspeção de chamadas
vi.mock("@/services/registrationService", () => ({
  registrationService: {
    createAccount: vi.fn(),
  },
}));

const service = vi.mocked(registrationService);

/**
 * Promessa controlada para testar estados visuais intermediários (ex: loading e campos desabilitados)
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

function renderRegisterAuth() {
  const user = userEvent.setup();
  render(<RegisterAuth />);

  return {
    user,
    nameInput: screen.getByLabelText("Nome Completo"),
    emailInput: screen.getByLabelText("E-mail"),
    passwordInput: screen.getByLabelText(/^senha$/i),
    confirmPasswordInput: screen.getByLabelText("Confirme sua senha"),
    imageInput: screen.getByLabelText(/foto de perfil/i),
    submitButton: screen.getByRole("button", { name: SUBMIT_BUTTON_TEXT }),
    loginLink: screen.getByRole("link", { name: LOGIN_LINK_TEXT }),
  };
}

describe("[US01] RegisterAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve renderizar todos os campos do formulário (Nome Completo, E-mail, Senha, Confirme sua senha e Foto de Perfil [opcional])", () => {
    const { nameInput, emailInput, passwordInput, confirmPasswordInput, imageInput } = renderRegisterAuth();

    // Garante que todos os campos esperados pelo PRD estão disponíveis para o usuário
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("type", "text");
    expect(nameInput).toBeRequired();

    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toBeRequired();

    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toBeRequired();

    expect(confirmPasswordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toBeRequired();

    // Foto de perfil deve ser opcional: o atributo HTML required não pode estar presente
    expect(imageInput).toBeInTheDocument();
    expect(imageInput).toHaveAttribute("type", "file");
    expect(imageInput).not.toBeRequired();
    // Restrição específica de extensões JPG/PNG
    expect(imageInput).toHaveAttribute("accept", "image/png, image/jpeg, image/jpg");
  });

  it("Deve renderizar o botão de submissão habilitado com o rótulo 'Cadastrar'", () => {
    const { submitButton } = renderRegisterAuth();

    // O botão deve ser do tipo submit e estar imediatamente disponível no carregamento da tela
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
    expect(submitButton).toBeEnabled();
  });

  it("Deve renderizar o link 'Faça login' apontando para a página raiz ('/')", () => {
    const { loginLink } = renderRegisterAuth();

    // O usuário que já possui conta deve conseguir navegar de volta para o login
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/");
  });

  it("Deve exibir o texto 'Imagem selecionada com sucesso' ao escolher arquivo de imagem válido", async () => {
    const { user, imageInput } = renderRegisterAuth();
    const validFile = makeImageFile(2048, "image/png", "foto-perfil.png");

    // Seleção de arquivo de 2KB
    await user.upload(imageInput, validFile);

    // O feedback textual positivo deve ser exibido após a seleção válida
    expect(screen.getByText(IMAGE_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it("Deve realizar o envio com sucesso mesmo sem selecionar nenhuma foto de perfil (foto opcional)", async () => {
    service.createAccount.mockResolvedValue(undefined);
    const { user, nameInput, emailInput, passwordInput, confirmPasswordInput, submitButton } = renderRegisterAuth();

    // Preenche todos os campos de texto obrigatórios sem tocar no campo de foto
    await user.type(nameInput, "João da Silva");
    await user.type(emailInput, "joao.silva@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "Senha@123");
    await user.click(submitButton);

    // O serviço deve ter sido chamado com a foto como nula, cumprindo o critério de foto opcional
    expect(service.createAccount).toHaveBeenCalledTimes(1);
    expect(service.createAccount).toHaveBeenCalledWith({
      name: "João da Silva",
      email: "joao.silva@uefs.br",
      password: "Senha@123",
      image: null,
    });

    // O toast de sucesso deve aparecer na tela
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it("Deve exibir estado 'Criando conta...' e desabilitar todos os campos e o botão durante a submissão", async () => {
    const pending = deferred<void>();
    service.createAccount.mockReturnValue(pending.promise);

    const { user, nameInput, emailInput, passwordInput, confirmPasswordInput, imageInput, submitButton } =
      renderRegisterAuth();

    await user.type(nameInput, "Maria Santos");
    await user.type(emailInput, "maria.santos@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "Senha@123");

    // Submete o formulário com o envio ainda em andamento
    await user.click(submitButton);

    // Enquanto a requisição estiver pendente, o rótulo muda e o botão é desabilitado para evitar reenvio
    expect(screen.getByRole("button", { name: SUBMIT_BUTTON_LOADING_TEXT })).toBeDisabled();

    // Todos os campos de entrada devem ser travados durante o carregamento
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();
    expect(imageInput).toBeDisabled();

    // Ao finalizar a resposta, os campos e botão devem ser restabelecidos
    pending.resolve();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: SUBMIT_BUTTON_TEXT })).toBeEnabled();
    });
  });

  it("Deve exibir Toast de erro quando a API rejeitar o cadastro com mensagem específica", async () => {
    service.createAccount.mockRejectedValue(makeApiError(API_ERROR_TEXT, 409));
    const { user, nameInput, emailInput, passwordInput, confirmPasswordInput, submitButton } = renderRegisterAuth();

    await user.type(nameInput, "Carlos Souza");
    await user.type(emailInput, "carlos.duplicado@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "Senha@123");
    await user.click(submitButton);

    // Toast com a mensagem de erro específica do backend deve ser exibido
    expect(await screen.findByText(API_ERROR_MESSAGE)).toBeInTheDocument();
  });

  it("Deve fechar o Toast de erro ao clicar no botão de fechar", async () => {
    const { user, nameInput, emailInput, passwordInput, confirmPasswordInput, submitButton } = renderRegisterAuth();

    // Gera erro de senhas divergentes para exibir o toast imediatamente no cliente
    await user.type(nameInput, "Carlos Souza");
    await user.type(emailInput, "carlos@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "SenhaDiferente@999");
    await user.click(submitButton);

    expect(screen.getByText(PASSWORD_MISMATCH_MESSAGE)).toBeInTheDocument();

    // Clica no botão de fechar do Toast (ícone X com aria-label)
    const closeToastButton = screen.getByRole("button", { name: /fechar/i });
    await user.click(closeToastButton);

    // O Toast deve sumir da tela
    expect(screen.queryByText(PASSWORD_MISMATCH_MESSAGE)).not.toBeInTheDocument();
  });

  it("[QA] Deve aplicar área de toque (touch target) de no mínimo 44x44 pixels (min-h-11) no botão de submissão", () => {
    const { submitButton } = renderRegisterAuth();

    // O jsdom não calcula layout: a conformidade de 44px para mobile decorre das classes utilitárias do Tailwind
    expect(submitButton.className).toMatch(/(^|\s)min-h-(11|\[44px\])(\s|$)/);
  });

  it("[QA] Deve expor mensagens de erro com role=\"alert\" para tecnologias assistivas", async () => {
    service.createAccount.mockRejectedValue(makeApiError(API_ERROR_TEXT, 400));
    const { user, nameInput, emailInput, passwordInput, confirmPasswordInput, submitButton } = renderRegisterAuth();

    await user.type(nameInput, "João");
    await user.type(emailInput, "joao@uefs.br");
    await user.type(passwordInput, "Senha@123");
    await user.type(confirmPasswordInput, "Senha@123");
    await user.click(submitButton);

    // Leitores de tela exigem que alertas e erros sejam anunciados através de role="alert"
    const alertElement = await screen.findByRole("alert");
    expect(alertElement).toHaveTextContent(API_ERROR_MESSAGE);
  });
});
