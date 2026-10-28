import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditRoomModal } from "@/components/features/rooms/EditRoomModal";
import {
  EMPTY_NAME,
  makeRoom,
  NAME_100_CHARS,
  NAME_101_CHARS,
  NAME_2_CHARS,
  NAME_3_CHARS,
  NAME_51_CHARS,
  NAME_LENGTH_ERROR_TEXT,
  SAVE_BUTTON_TEXT,
  SAVING_BUTTON_TEXT,
  TRIMMED_NAME,
  UNTRIMMED_NAME,
  UPDATE_ROOM_ERROR_TEXT,
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
  room = makeRoom({ name: "Nome Inicial" }),
  onClose = vi.fn(),
  onSubmit = vi.fn().mockResolvedValue(undefined),
} = {}) {
  const user = userEvent.setup();
  render(<EditRoomModal room={room} onClose={onClose} onSubmit={onSubmit} />);

  return {
    user,
    room,
    onClose,
    onSubmit,
    nameInput: screen.getByRole("textbox", { name: /título|nome da sala/i }),
    submitButton: screen.getByRole("button", { name: SAVE_BUTTON_TEXT }),
    closeButton: screen.getByRole("button", { name: /fechar/i }),
  };
}

describe("[US03] EditRoomModal", () => {
  it("Deve iniciar preenchido com o nome atual da sala", () => {
    const { nameInput } = renderModal({ room: makeRoom({ name: "Engenharia de Software" }) });

    expect(nameInput).toHaveValue("Engenharia de Software");
  });

  it.each([
    ["vazio", EMPTY_NAME],
    ["apenas espaços", WHITESPACE_NAME],
    ["2 caracteres", NAME_2_CHARS],
    ["101 caracteres", NAME_101_CHARS],
  ])(
    "Deve recusar edição com nome inválido (%s), exibir alerta e não chamar onSubmit",
    async (_, invalidName) => {
      const { user, nameInput, submitButton, onSubmit, onClose } = renderModal();

      await user.clear(nameInput);
      if (invalidName.length > 0) {
        await user.type(nameInput, invalidName);
      }
      await user.click(submitButton);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(NAME_LENGTH_ERROR_TEXT);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["3 caracteres", NAME_3_CHARS],
    ["100 caracteres", NAME_100_CHARS],
  ])(
    "Deve aceitar nome válido no limiar de %s, chamar onSubmit e fechar o modal",
    async (_, validName) => {
      const { user, nameInput, submitButton, onSubmit, onClose } = renderModal();

      await user.clear(nameInput);
      await user.type(nameInput, validName);
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(validName);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  );

  it("Deve aplicar trim() no nome alterado antes de enviar ao callback onSubmit", async () => {
    const { user, nameInput, submitButton, onSubmit } = renderModal();

    await user.clear(nameInput);
    await user.type(nameInput, UNTRIMMED_NAME);
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(TRIMMED_NAME);
  });

  it("Deve exibir 'Salvando...' e desabilitar os campos e botões durante a requisição", async () => {
    const pending = deferred<void>();
    const onSubmit = vi.fn().mockReturnValue(pending.promise);
    const { user, nameInput, submitButton, closeButton } = renderModal({ onSubmit });

    await user.clear(nameInput);
    await user.type(nameInput, "Redes de Computadores");
    await user.click(submitButton);

    const loadingButton = screen.getByRole("button", { name: SAVING_BUTTON_TEXT });
    expect(loadingButton).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(closeButton).toBeDisabled();

    pending.resolve();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: SAVING_BUTTON_TEXT })).not.toBeInTheDocument();
    });
  });

  it("Deve manter o modal aberto e exibir erro em role='alert' quando onSubmit for rejeitado", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Erro no servidor"));
    const { user, nameInput, submitButton, onClose } = renderModal({ onSubmit });

    await user.clear(nameInput);
    await user.type(nameInput, "Inteligência Artificial");
    await user.click(submitButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(UPDATE_ROOM_ERROR_TEXT);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: SAVE_BUTTON_TEXT })).toBeEnabled();
  });

  it("[QA] Deve validar que nomes entre 51 e 100 caracteres NÃO exibem estado de erro visual e o contador reflete /100", async () => {
    const { user, nameInput } = renderModal();

    await user.clear(nameInput);
    await user.type(nameInput, NAME_51_CHARS);

    const counter = screen.getByText(/51\/100/);
    expect(counter).toBeInTheDocument();

    expect(counter.className).not.toContain("text-red-400");
    expect(nameInput.className).not.toContain("ring-red-400");
  });
});
