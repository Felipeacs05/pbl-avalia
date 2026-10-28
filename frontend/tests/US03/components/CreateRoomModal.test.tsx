import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateRoomModal } from "@/components/features/rooms/CreateRoomModal";
import {
  CREATE_BUTTON_TEXT,
  CREATE_ROOM_ERROR_TEXT,
  CREATING_BUTTON_TEXT,
  EMPTY_NAME,
  NAME_100_CHARS,
  NAME_101_CHARS,
  NAME_2_CHARS,
  NAME_3_CHARS,
  NAME_50_CHARS,
  NAME_51_CHARS,
  NAME_LENGTH_ERROR_TEXT,
  TRIMMED_NAME,
  UNTRIMMED_NAME,
  WHITESPACE_NAME,
} from "../fixtures";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderModal({
  onClose = vi.fn(),
  onSubmit = vi.fn().mockResolvedValue(undefined),
} = {}) {
  const user = userEvent.setup();
  render(<CreateRoomModal onClose={onClose} onSubmit={onSubmit} />);

  return {
    user,
    onClose,
    onSubmit,
    nameInput: screen.getByRole("textbox", { name: /título|nome da sala/i }),
    submitButton: screen.getByRole("button", { name: CREATE_BUTTON_TEXT }),
    closeButton: screen.getByRole("button", { name: /fechar/i }),
  };
}

describe("[US03] CreateRoomModal", () => {
  it.each([
    ["vazio", EMPTY_NAME],
    ["apenas espaços", WHITESPACE_NAME],
    ["2 caracteres", NAME_2_CHARS],
    ["101 caracteres", NAME_101_CHARS],
  ])(
    "Deve recusar submissão com nome inválido (%s), exibir alerta de erro e não chamar onSubmit",
    async (_, invalidName) => {
      const { user, nameInput, submitButton, onSubmit, onClose } = renderModal();

      if (invalidName.length > 0) {
        await user.type(nameInput, invalidName);
      }
      await user.click(submitButton);

      // Alerta acessível em role="alert"
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(NAME_LENGTH_ERROR_TEXT);

      // Não dispara requisição nem fecha o modal
      expect(onSubmit).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["3 caracteres (limite inferior)", NAME_3_CHARS],
    ["100 caracteres (limite superior)", NAME_100_CHARS],
  ])(
    "Deve aceitar nome válido no limiar de %s, chamar onSubmit e fechar o modal ao resolver",
    async (_, validName) => {
      const { user, nameInput, submitButton, onSubmit, onClose } = renderModal();

      await user.type(nameInput, validName);
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(validName);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  );

  it("Deve aplicar trim() no nome antes de enviar ao callback onSubmit", async () => {
    const { user, nameInput, submitButton, onSubmit } = renderModal();

    await user.type(nameInput, UNTRIMMED_NAME);
    await user.click(submitButton);

    // O onSubmit deve receber o nome limpo sem espaços laterais
    expect(onSubmit).toHaveBeenCalledWith(TRIMMED_NAME);
  });

  it("Deve exibir 'Criando...' e desabilitar os campos e botões enquanto a submissão estiver em andamento", async () => {
    const pending = deferred<void>();
    const onSubmit = vi.fn().mockReturnValue(pending.promise);
    const { user, nameInput, submitButton, closeButton } = renderModal({ onSubmit });

    await user.type(nameInput, "Banco de Dados");
    await user.click(submitButton);

    // Estado visual de carregamento
    const loadingButton = screen.getByRole("button", { name: CREATING_BUTTON_TEXT });
    expect(loadingButton).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(closeButton).toBeDisabled();

    // Ao concluir, resolve
    pending.resolve();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: CREATING_BUTTON_TEXT })).not.toBeInTheDocument();
    });
  });

  it("Deve manter o modal aberto e exibir erro em role='alert' quando onSubmit for rejeitado", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Falha de rede"));
    const { user, nameInput, submitButton, onClose } = renderModal({ onSubmit });

    await user.type(nameInput, "Estruturas de Dados");
    await user.click(submitButton);

    // Erro amigável
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(CREATE_ROOM_ERROR_TEXT);

    // O modal não deve fechar para permitir nova tentativa
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: CREATE_BUTTON_TEXT })).toBeEnabled();
  });

  it("[QA] Deve validar que nomes entre 51 e 100 caracteres NÃO exibem estado de erro visual e o contador reflete o limite de 100", async () => {
    const { user, nameInput } = renderModal();

    // Digita 51 caracteres (antigo limiar incorreto de 50)
    await user.type(nameInput, NAME_51_CHARS);

    // O contador de caracteres deve refletir o limite do PRD (51/100)
    const counter = screen.getByText(/51\/100/);
    expect(counter).toBeInTheDocument();

    // Não deve conter a classe de erro vermelho no texto nem o ring vermelho no input
    expect(counter.className).not.toContain("text-red-400");
    expect(nameInput.className).not.toContain("ring-red-400");
  });
});
