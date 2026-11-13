import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import {
  NEW_NAME,
  oversizedPhoto,
  PHOTO_TOO_LARGE_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  STORED_USER,
  stubObjectUrls,
  validPhoto,
} from "../fixtures";

// Camada de UI (apresentação): dados cadastrais. Recebe estado por props e devolve a submissão por callback.

type FormProps = { isSaving?: boolean; successMessage?: string | null; error?: string | null };

let urls: ReturnType<typeof stubObjectUrls>;

function renderForm({ isSaving = false, successMessage = null, error = null }: FormProps = {}) {
  const onSubmit = vi.fn<(values: { name: string; photo: File | null }) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup({ applyAccept: false });
  render(
    <ProfileForm
      name={STORED_USER.name}
      email={STORED_USER.email}
      photoUrl={STORED_USER.profilePictureUrl}
      isSaving={isSaving}
      successMessage={successMessage}
      error={error}
      onSubmit={onSubmit}
    />,
  );
  return {
    user,
    onSubmit,
    nameInput: () => screen.getByRole("textbox", { name: /^nome/i }) as HTMLInputElement,
    photoInput: () => screen.getByLabelText(/foto de perfil/i),
    saveButton: () => screen.getByRole("button", { name: /salvar/i }),
  };
}

describe("[US23] ProfileForm", () => {
  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  it("Deve vir preenchido com o nome atual e mostrar o e-mail sem permitir editá-lo", () => {
    const { nameInput } = renderForm();

    expect(nameInput()).toHaveValue(STORED_USER.name);
    expect(document.body).toHaveTextContent(STORED_USER.email);
    // A US só permite alterar nome, foto e senha: o e-mail identifica a conta
    const editableEmail = screen
      .queryAllByRole("textbox")
      .filter((el) => (el as HTMLInputElement).value === STORED_USER.email && !(el as HTMLInputElement).readOnly && !(el as HTMLInputElement).disabled);
    expect(editableEmail).toHaveLength(0);
  });

  it("Deve ter nome acessível próprio para não se confundir com o formulário de senha", () => {
    renderForm();

    expect(screen.getByRole("form", { name: /perfil/i })).toBeInTheDocument();
  });

  // --- SUBMISSÃO ---

  it("Deve enviar só o novo nome quando nenhuma foto foi escolhida", async () => {
    const { user, onSubmit, nameInput, saveButton } = renderForm();

    await user.clear(nameInput());
    await user.type(nameInput(), NEW_NAME);
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ name: NEW_NAME, photo: null });
  });

  it("Deve enviar o nome e a foto escolhida", async () => {
    const { user, onSubmit, nameInput, photoInput, saveButton } = renderForm();
    const photo = validPhoto();

    await user.clear(nameInput());
    await user.type(nameInput(), NEW_NAME);
    await user.upload(photoInput(), photo);
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith({ name: NEW_NAME, photo });
  });

  it("Deve remover espaços antes e depois do nome", async () => {
    const { user, onSubmit, nameInput, saveButton } = renderForm();

    await user.clear(nameInput());
    await user.type(nameInput(), `  ${NEW_NAME}  `);
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith({ name: NEW_NAME, photo: null });
  });

  it("Não deve enviar com o nome em branco", async () => {
    const { user, onSubmit, nameInput, saveButton } = renderForm();

    await user.clear(nameInput());
    await user.type(nameInput(), "   ");
    await user.click(saveButton());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // --- PAYLOAD ACIMA DE 5MB ---

  it("Deve alertar a foto acima de 5MB e, ao salvar, enviar o restante sem foto", async () => {
    const { user, onSubmit, photoInput, saveButton } = renderForm();

    await user.upload(photoInput(), oversizedPhoto());
    expect(screen.getByRole("alert")).toHaveTextContent(PHOTO_TOO_LARGE_MESSAGE);

    await user.click(saveButton());

    // A seleção inválida foi descartada: o arquivo grande nunca chega ao callback
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ name: STORED_USER.name, photo: null });
  });

  it("Deve enviar sem foto quando uma foto válida foi trocada por uma acima de 5MB", async () => {
    const { user, onSubmit, photoInput, saveButton } = renderForm();

    await user.upload(photoInput(), validPhoto());
    await user.upload(photoInput(), oversizedPhoto());
    await user.click(saveButton());

    expect(onSubmit).toHaveBeenCalledWith({ name: STORED_USER.name, photo: null });
  });

  // --- FEEDBACK E LOADING ---

  it("Deve exibir o erro recebido em um alerta (ex.: recusa de tamanho do backend)", () => {
    renderForm({ error: "A imagem selecionada excede o limite de 5MB." });

    expect(screen.getByRole("alert")).toHaveTextContent(SIZE_LIMIT_MESSAGE);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Deve exibir a confirmação recebida", () => {
    renderForm({ successMessage: "Perfil atualizado com sucesso." });

    expect(screen.getByRole("status")).toHaveTextContent("Perfil atualizado com sucesso.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve mostrar um único loading visual e desabilitar o envio durante o processamento", async () => {
    const { user, onSubmit, saveButton } = renderForm({ isSaving: true });

    // getByRole falha se houver mais de um: o loading é o do componente de upload
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.click(saveButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
