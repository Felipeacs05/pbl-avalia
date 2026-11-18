import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profileService } from "@/services/profileService";
import {
  CURRENT_PASSWORD,
  jsonResponse,
  makeFileTooLargeBody,
  makeUserResponse,
  makeValidationBody,
  makeWrongPasswordBody,
  NAME_REQUIRED_TEXT,
  NEW_NAME,
  NEW_PASSWORD,
  PASSWORD_CHANGED_TEXT,
  PASSWORD_ROUTE,
  PROFILE_ROUTE,
  readBlobText,
  SIZE_LIMIT_MESSAGE,
  STORED_TOKEN,
  storeSession,
  validPhoto,
  WRONG_CURRENT_PASSWORD_TEXT,
  WRONG_PASSWORD,
} from "../fixtures";

// Camada de SERVICE: só fala HTTP. A fronteira simulada é o fetch global; o authFetch (Bearer) roda de verdade,
// como no roomService da US03.

function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init ?? {} };
}

async function sentDataPart(init: RequestInit) {
  const form = init.body as FormData;
  const data = form.get("data") as Blob;
  return { type: data.type, json: JSON.parse(await readBlobText(data)) };
}

describe("[US23] profileService", () => {
  beforeEach(() => {
    localStorage.clear();
    storeSession();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- PERFIL: PUT /api/v1/users/me/profile ---

  it("Deve enviar o nome em PUT /api/v1/users/me/profile, autenticado, e devolver o usuário atualizado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeUserResponse(), 200));

    await expect(profileService.updateProfile({ name: NEW_NAME, photo: null })).resolves.toEqual(makeUserResponse());

    const { url, init } = singleFetchCall();
    expect(url).toMatch(PROFILE_ROUTE);
    // Caminho relativo: passa pelo rewrite /api/* do Next, como as demais rotas protegidas
    expect(url.startsWith("/")).toBe(true);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${STORED_TOKEN}`);
  });

  it("Deve enviar multipart no formato do cadastro: parte 'data' em JSON só com o nome e sem foto quando não há arquivo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeUserResponse(), 200));

    await profileService.updateProfile({ name: NEW_NAME, photo: null });

    const { init } = singleFetchCall();
    expect(init.body).toBeInstanceOf(FormData);
    const data = await sentDataPart(init);
    expect(data.type).toBe("application/json");
    // A identidade vem do token: nada de id ou e-mail no corpo
    expect(data.json).toEqual({ name: NEW_NAME });
    expect((init.body as FormData).has("photo")).toBe(false);
  });

  it("Deve anexar a foto na parte 'photo' quando houver arquivo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeUserResponse(), 200));
    const photo = validPhoto();

    await profileService.updateProfile({ name: NEW_NAME, photo });

    const { init } = singleFetchCall();
    const sent = (init.body as FormData).get("photo") as File;
    expect(sent).toBeInstanceOf(File);
    expect({ name: sent.name, size: sent.size, type: sent.type }).toEqual({
      name: photo.name,
      size: photo.size,
      type: photo.type,
    });
    expect((await sentDataPart(init)).json).toEqual({ name: NEW_NAME });
  });

  it("Não deve definir Content-Type manualmente no multipart (o navegador precisa gerar o boundary)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeUserResponse(), 200));

    await profileService.updateProfile({ name: NEW_NAME, photo: validPhoto() });

    const { init } = singleFetchCall();
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("Deve rejeitar com { status, message } citando 5MB quando o backend recusa o tamanho do arquivo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeFileTooLargeBody(), 400));

    const error = await profileService.updateProfile({ name: NEW_NAME, photo: validPhoto() }).catch((e: unknown) => e);

    // O texto do backend vem em inglês; o front pode repassá-lo ou traduzi-lo, desde que cite o limite
    expect(error).toMatchObject({ status: 400, message: expect.stringMatching(SIZE_LIMIT_MESSAGE) });
  });

  it("Deve rejeitar com os erros de campo quando o backend recusa a validação do nome", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeValidationBody(), 400));

    const error = await profileService.updateProfile({ name: " ", photo: null }).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 400, fieldErrors: { name: NAME_REQUIRED_TEXT } });
    expect((error as { message: string }).message.trim()).not.toBe("");
  });

  it("Deve rejeitar com status 401 quando o token foi revogado, para o hook poder encerrar a sessão", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 401 }));

    const error = await profileService.updateProfile({ name: NEW_NAME, photo: null }).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401, message: expect.any(String) });
  });

  it("Deve rejeitar com status 0 quando não há resposta do servidor (falha de rede)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = await profileService.updateProfile({ name: NEW_NAME, photo: null }).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 0, message: expect.any(String) });
    expect((error as { message: string }).message.trim()).not.toBe("");
  });

  // --- SENHA: PUT /api/v1/users/me/password ---

  it("Deve enviar a senha atual e a nova em JSON para PUT /api/v1/users/me/password e devolver a mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: PASSWORD_CHANGED_TEXT }, 200));

    await expect(
      profileService.changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
    ).resolves.toEqual({ message: PASSWORD_CHANGED_TEXT });

    const { url, init } = singleFetchCall();
    expect(url).toMatch(PASSWORD_ROUTE);
    expect(url.startsWith("/")).toBe(true);
    expect(init.method).toBe("PUT");
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toMatch(/application\/json/);
    expect(headers.get("Authorization")).toBe(`Bearer ${STORED_TOKEN}`);
    expect(JSON.parse(String(init.body))).toEqual({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD });
  });

  it("Deve rejeitar com { status: 400, message: 'Senha atual incorreta.' } quando a senha atual está errada", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeWrongPasswordBody(), 400));

    await expect(
      profileService.changePassword({ currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD }),
    ).rejects.toEqual({ status: 400, message: WRONG_CURRENT_PASSWORD_TEXT });
  });

  it("Deve rejeitar com mensagem padrão não vazia quando o backend responde sem corpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 500 }));

    const error = await profileService
      .changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 500, message: expect.any(String) });
    expect((error as { message: string }).message.trim()).not.toBe("");
  });
});
