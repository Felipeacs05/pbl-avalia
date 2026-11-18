import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEditProfile } from "@/hooks/useEditProfile";
import { profileService } from "@/services/profileService";
import {
  exactLimitPhoto,
  LOGIN_PAGE,
  makeFileTooLargeError,
  makeUnauthorizedError,
  makeUserResponse,
  NEW_NAME,
  NEW_PHOTO_URL,
  oversizedPhoto,
  pdfFile,
  PHOTO_INVALID_TYPE_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  PROFILE_SAVED_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  STORED_USER,
  storedUser,
  storeSession,
  validPhoto,
} from "../fixtures";

// Camada de HOOK: estado da tela, regra de envio e sincronização da sessão. O service é simulado.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/services/profileService", () => ({
  profileService: { updateProfile: vi.fn(), changePassword: vi.fn() },
}));

const service = vi.mocked(profileService);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("[US23] useEditProfile", () => {
  beforeEach(() => {
    mockPush.mockReset();
    localStorage.clear();
    storeSession();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("Deve começar com os dados do usuário logado, sem envio em andamento e sem mensagens", () => {
    const { result } = renderHook(() => useEditProfile());

    expect(result.current.profile).toMatchObject({
      name: STORED_USER.name,
      email: STORED_USER.email,
      profilePictureUrl: STORED_USER.profilePictureUrl,
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // --- SALVAR ---

  it("Deve enviar nome e foto ao service, atualizar o perfil exibido e confirmar o sucesso", async () => {
    service.updateProfile.mockResolvedValue(makeUserResponse());
    const photo = validPhoto();
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo });
    });

    expect(service.updateProfile).toHaveBeenCalledTimes(1);
    expect(service.updateProfile).toHaveBeenCalledWith({ name: NEW_NAME, photo });
    expect(result.current.profile).toMatchObject({ name: NEW_NAME, profilePictureUrl: NEW_PHOTO_URL });
    expect(result.current.successMessage).toMatch(PROFILE_SAVED_MESSAGE);
    expect(result.current.error).toBeNull();
  });

  it("Deve atualizar o usuário salvo na sessão, mantendo id e e-mail, para o resto do app ver o novo nome e foto", async () => {
    service.updateProfile.mockResolvedValue(makeUserResponse());
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: null });
    });

    expect(storedUser()).toMatchObject({
      id: STORED_USER.id,
      email: STORED_USER.email,
      name: NEW_NAME,
      profilePictureUrl: NEW_PHOTO_URL,
    });
    // Editar o perfil não mexe no token
    expect(localStorage.getItem("token")).not.toBeNull();
  });

  it("Deve remover espaços do nome antes de enviar", async () => {
    service.updateProfile.mockResolvedValue(makeUserResponse());
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: `  ${NEW_NAME}  `, photo: null });
    });

    expect(service.updateProfile).toHaveBeenCalledWith({ name: NEW_NAME, photo: null });
  });

  it("Não deve chamar o service com nome em branco e deve expor um erro", async () => {
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: "   ", photo: null });
    });

    expect(service.updateProfile).not.toHaveBeenCalled();
    expect(result.current.error?.trim()).toBeTruthy();
  });

  // --- PAYLOAD ACIMA DE 5MB E FORMATO ---

  it("Não deve enviar foto acima de 5MB: expõe o erro de limite e não chama o service", async () => {
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: oversizedPhoto() });
    });

    expect(service.updateProfile).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(PHOTO_TOO_LARGE_MESSAGE);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.profile).toMatchObject({ name: STORED_USER.name, profilePictureUrl: STORED_USER.profilePictureUrl });
    expect(storedUser()).toEqual(STORED_USER);
  });

  it("Fronteira: deve enviar a foto com exatamente 5MB", async () => {
    service.updateProfile.mockResolvedValue(makeUserResponse());
    const photo = exactLimitPhoto();
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo });
    });

    expect(service.updateProfile).toHaveBeenCalledWith({ name: NEW_NAME, photo });
    expect(result.current.error).toBeNull();
  });

  it("Não deve enviar arquivo que não seja JPG ou PNG", async () => {
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: pdfFile() });
    });

    expect(service.updateProfile).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(PHOTO_INVALID_TYPE_MESSAGE);
  });

  it("Deve expor a recusa de tamanho do backend sem propagar e sem alterar o perfil nem a sessão", async () => {
    service.updateProfile.mockRejectedValue(makeFileTooLargeError());
    const { result } = renderHook(() => useEditProfile());

    // Se a rejeição escapar do hook, este await falha o teste
    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: validPhoto() });
    });

    expect(result.current.error).toMatch(SIZE_LIMIT_MESSAGE);
    expect(result.current.successMessage).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.profile).toMatchObject({ name: STORED_USER.name });
    expect(storedUser()).toEqual(STORED_USER);
  });

  it("Deve encerrar a sessão e levar ao login quando o backend responde 401 (token revogado por troca de senha)", async () => {
    service.updateProfile.mockRejectedValue(makeUnauthorizedError());
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: null });
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith(LOGIN_PAGE);
  });

  it("Não deve encerrar a sessão em erros que não são 401", async () => {
    service.updateProfile.mockRejectedValue(makeFileTooLargeError());
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: validPhoto() });
    });

    expect(localStorage.getItem("token")).not.toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Deve expor uma mensagem padrão quando o erro não traz message", async () => {
    service.updateProfile.mockRejectedValue({ status: 500 });
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: null });
    });

    expect(typeof result.current.error).toBe("string");
    expect(result.current.error?.trim()).not.toBe("");
  });

  it("Deve limpar o erro anterior quando o próximo envio for bem-sucedido", async () => {
    service.updateProfile.mockResolvedValue(makeUserResponse());
    const { result } = renderHook(() => useEditProfile());

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: oversizedPhoto() });
    });
    expect(result.current.error).toMatch(PHOTO_TOO_LARGE_MESSAGE);

    await act(async () => {
      await result.current.saveProfile({ name: NEW_NAME, photo: validPhoto() });
    });

    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toMatch(PROFILE_SAVED_MESSAGE);
  });

  // --- LOADING VISUAL ---

  it("Deve manter isSaving verdadeiro enquanto o envio está em processamento", async () => {
    const pending = deferred<ReturnType<typeof makeUserResponse>>();
    service.updateProfile.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useEditProfile());

    let call!: Promise<void>;
    act(() => {
      call = result.current.saveProfile({ name: NEW_NAME, photo: validPhoto() });
    });
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      pending.resolve(makeUserResponse());
      await call;
    });
    expect(result.current.isSaving).toBe(false);
  });
});
