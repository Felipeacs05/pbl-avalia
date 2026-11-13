import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePanel } from "@/components/features/profile/ProfilePanel";
import { useChangePassword } from "@/hooks/useChangePassword";
import { useEditProfile } from "@/hooks/useEditProfile";
import {
  CURRENT_PASSWORD,
  NEW_NAME,
  NEW_PASSWORD,
  PHOTO_TOO_LARGE_MESSAGE,
  STORED_USER,
  stubObjectUrls,
  validPhoto,
  WRONG_CURRENT_PASSWORD_TEXT,
} from "../fixtures";

// Camada de UI (container): só liga os hooks aos formulários. Os hooks são simulados.
vi.mock("@/hooks/useEditProfile", () => ({ useEditProfile: vi.fn() }));
vi.mock("@/hooks/useChangePassword", () => ({ useChangePassword: vi.fn() }));

type EditState = ReturnType<typeof useEditProfile>;
type PasswordState = ReturnType<typeof useChangePassword>;

function mockHooks(edit: Partial<EditState> = {}, password: Partial<PasswordState> = {}) {
  const editState = {
    profile: { ...STORED_USER },
    saveProfile: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
    successMessage: null,
    error: null,
    ...edit,
  } as EditState;
  const passwordState = {
    changePassword: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    successMessage: null,
    error: null,
    ...password,
  } as PasswordState;
  vi.mocked(useEditProfile).mockReturnValue(editState);
  vi.mocked(useChangePassword).mockReturnValue(passwordState);
  return { editState, passwordState };
}

const profileForm = () => within(screen.getByRole("form", { name: /perfil/i }));
const passwordForm = () => within(screen.getByRole("form", { name: /senha/i }));

let urls: ReturnType<typeof stubObjectUrls>;

describe("[US23] ProfilePanel", () => {
  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  it("Deve mostrar os dados do perfil vindos do hook", () => {
    mockHooks();
    render(<ProfilePanel />);

    expect(profileForm().getByRole("textbox", { name: /^nome/i })).toHaveValue(STORED_USER.name);
    expect(document.body).toHaveTextContent(STORED_USER.email);
  });

  it("Deve salvar nome e foto pelo hook de perfil, sem acionar a troca de senha", async () => {
    const { editState, passwordState } = mockHooks();
    const user = userEvent.setup();
    const photo = validPhoto();
    render(<ProfilePanel />);

    const name = profileForm().getByRole("textbox", { name: /^nome/i });
    await user.clear(name);
    await user.type(name, NEW_NAME);
    await user.upload(profileForm().getByLabelText(/foto de perfil/i), photo);
    await user.click(profileForm().getByRole("button", { name: /salvar/i }));

    expect(editState.saveProfile).toHaveBeenCalledTimes(1);
    expect(editState.saveProfile).toHaveBeenCalledWith({ name: NEW_NAME, photo });
    expect(passwordState.changePassword).not.toHaveBeenCalled();
  });

  it("Deve trocar a senha pelo hook de senha, sem acionar o salvamento do perfil", async () => {
    const { editState, passwordState } = mockHooks();
    const user = userEvent.setup();
    render(<ProfilePanel />);

    await user.type(passwordForm().getByLabelText(/senha atual/i), CURRENT_PASSWORD);
    await user.type(passwordForm().getByLabelText(/nova senha/i), NEW_PASSWORD);
    await user.click(passwordForm().getByRole("button", { name: /alterar senha/i }));

    expect(passwordState.changePassword).toHaveBeenCalledWith(CURRENT_PASSWORD, NEW_PASSWORD);
    expect(editState.saveProfile).not.toHaveBeenCalled();
  });

  // --- CADA ERRO NO SEU FORMULÁRIO ---

  it("Deve mostrar o erro de senha atual incorreta dentro do formulário de senha, e não no de perfil", () => {
    mockHooks({}, { error: WRONG_CURRENT_PASSWORD_TEXT });
    render(<ProfilePanel />);

    expect(passwordForm().getByRole("alert")).toHaveTextContent(WRONG_CURRENT_PASSWORD_TEXT);
    expect(profileForm().queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve mostrar o erro de foto acima de 5MB dentro do formulário de perfil, e não no de senha", () => {
    mockHooks({ error: "A imagem selecionada excede o limite de 5MB." });
    render(<ProfilePanel />);

    expect(profileForm().getByRole("alert")).toHaveTextContent(PHOTO_TOO_LARGE_MESSAGE);
    expect(passwordForm().queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve repassar o envio em andamento do perfil (loading visual) sem bloquear a troca de senha", () => {
    mockHooks({ isSaving: true });
    render(<ProfilePanel />);

    expect(profileForm().getByRole("progressbar")).toBeInTheDocument();
    expect(profileForm().getByRole("button", { name: /salvar/i })).toBeDisabled();
    expect(passwordForm().getByRole("button", { name: /alterar senha/i })).toBeEnabled();
  });
});
