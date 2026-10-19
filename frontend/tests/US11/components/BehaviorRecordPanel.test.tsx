import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BehaviorRecordPanel } from "@/components/features/behavior-records/BehaviorRecordPanel";
import type { BehaviorRecordInput } from "@/types/behaviorRecord";
import {
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  FREE_TEXT,
  makeOtherTag,
  makeStudent,
  makeTag,
  OTHER_TAG_ID,
  TEXT_AT_LIMIT,
  TEXT_OVER_LIMIT,
  TEXT_TOO_LONG_MESSAGE,
} from "../fixtures";

function renderPanel({ isSaving = false, error = null as string | null } = {}) {
  const onRegister = vi.fn<(input: BehaviorRecordInput) => Promise<boolean>>().mockResolvedValue(true);
  const user = userEvent.setup();
  const tags = [makeTag(), makeOtherTag()];

  render(
    <BehaviorRecordPanel
      student={makeStudent()}
      tags={tags}
      isSaving={isSaving}
      error={error}
      onRegister={onRegister}
    />,
  );

  const panel = within(screen.getByRole("dialog", { name: /alice souza/i }));
  return {
    user,
    tags,
    onRegister,
    panel,
    textInput: panel.getByLabelText(/observação/i),
    saveButton: panel.getByRole("button", { name: /salvar observação/i }),
    counter: panel.getByRole("status"),
  };
}

// Colar em vez de digitar: 501 eventos de tecla deixariam o teste lento sem testar nada a mais
async function fillText(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, text: string) {
  await user.click(input);
  await user.paste(text);
}

describe("[US11] BehaviorRecordPanel", () => {
  it("Deve exibir o aluno selecionado com um botão para cada tag predefinida", () => {
    const { panel, tags } = renderPanel();

    tags.forEach((tag) => {
      expect(panel.getByRole("button", { name: tag.name })).toBeEnabled();
    });
  });

  // --- REGISTRO POR TAG ---

  it("Deve registrar a tag com um único toque, enviando só o id da tag tocada", async () => {
    const { user, panel, onRegister } = renderPanel();

    // A segunda tag da lista: o envio precisa usar o id, e não a posição
    await user.click(panel.getByRole("button", { name: "Celular fora de contexto" }));

    // 2º dos 2 toques do critério de aceite: sem confirmação intermediária
    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(onRegister).toHaveBeenCalledWith({ tagId: OTHER_TAG_ID });
  });

  // --- REGISTRO POR TEXTO LIVRE ---

  it("Deve enviar o texto livre digitado ao salvar a observação", async () => {
    const { user, onRegister, textInput, saveButton } = renderPanel();

    await user.type(textInput, FREE_TEXT);
    await user.click(saveButton);

    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(onRegister).toHaveBeenCalledWith({ text: FREE_TEXT });
  });

  it("[QA] Deve bloquear o envio com alerta e contador em vermelho quando o texto passa de 500 caracteres", async () => {
    const { user, panel, onRegister, textInput, saveButton, counter } = renderPanel();

    await fillText(user, textInput, TEXT_OVER_LIMIT);

    // O campo aceita o excesso: o bloqueio é do envio, e o tutor vê quanto precisa cortar
    expect(textInput).toHaveValue(TEXT_OVER_LIMIT);
    expect(counter).toHaveTextContent("501/500");
    expect(counter.className).toMatch(/text-red-/);
    expect(panel.getByRole("alert")).toHaveTextContent(TEXT_TOO_LONG_MESSAGE);
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);

    expect(onRegister).not.toHaveBeenCalled();
  });

  it("[QA] Deve aceitar exatamente 500 caracteres e enviá-los inteiros", async () => {
    const { user, panel, onRegister, textInput, saveButton, counter } = renderPanel();

    await fillText(user, textInput, TEXT_AT_LIMIT);

    expect(counter).toHaveTextContent("500/500");
    expect(counter.className).not.toMatch(/text-red-/);
    expect(panel.queryByRole("alert")).not.toBeInTheDocument();
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onRegister).toHaveBeenCalledWith({ text: TEXT_AT_LIMIT });
  });

  // --- SALVAMENTO E ERRO ---

  it("Deve desabilitar as tags e o envio enquanto um registro está sendo salvo", async () => {
    const { user, panel, onRegister, textInput, saveButton, tags } = renderPanel({ isSaving: true });

    // Um toque duplo durante a requisição geraria dois registros iguais
    tags.forEach((tag) => expect(panel.getByRole("button", { name: tag.name })).toBeDisabled());
    await user.type(textInput, FREE_TEXT);
    expect(saveButton).toBeDisabled();

    await user.click(panel.getByRole("button", { name: "Atraso" }));
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("Deve exibir em role=\"alert\" a mensagem do backend, mantendo as tags disponíveis", () => {
    const { panel, tags } = renderPanel({ error: FORBIDDEN_TEXT });

    expect(panel.getByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    tags.forEach((tag) => expect(panel.getByRole("button", { name: tag.name })).toBeEnabled());
  });

  it("Deve omitir o alerta quando não há erro e o texto está dentro do limite", async () => {
    const { user, panel, textInput, counter } = renderPanel();

    await user.type(textInput, FREE_TEXT);

    expect(counter).toHaveTextContent(`${FREE_TEXT.length}/500`);
    expect(panel.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve dar a cada tag e ao envio área de toque de no mínimo 44x44 pixels", () => {
    const { panel } = renderPanel();

    // O jsdom não calcula layout: a garantia vem das classes do Tailwind (11 = 44px), como na US09
    panel.getAllByRole("button").forEach((button) => {
      expect(button.className).toMatch(/(^|\s)min-h-(11|\[44px\])(\s|$)/);
      expect(button.className).toMatch(/(^|\s)min-w-(11|\[44px\])(\s|$)/);
    });
  });
});
