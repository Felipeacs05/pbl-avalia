import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "@/app/profile/page";
import {
  BACKEND_FILE_TOO_LARGE_TEXT,
  CURRENT_PASSWORD,
  exactLimitPhoto,
  LOGIN_PAGE,
  makePhoto,
  MAX_PHOTO_BYTES,
  MAX_REDIRECT_DELAY_MS,
  NAME_REQUIRED_TEXT,
  NEW_NAME,
  NEW_PASSWORD,
  oversizedPhoto,
  PASSWORD_CHANGED_TEXT,
  PASSWORD_ROUTE,
  pdfFile,
  PHOTO_INVALID_TYPE_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  PROFILE_ROUTE,
  PROFILE_SAVED_MESSAGE,
  readBlobText,
  SIZE_LIMIT_MESSAGE,
  STORED_TOKEN,
  STORED_USER,
  storedUser,
  storeSession,
  stubObjectUrls,
  validPhoto,
  WRONG_CURRENT_PASSWORD_TEXT,
  WRONG_PASSWORD,
} from "../fixtures";

// INTEGRAÇÃO da página /profile com todas as camadas reais:
// página -> ProfilePanel -> ProfileForm/ProfilePhotoUpload/ChangePasswordForm -> useEditProfile/useChangePassword
// -> profileService -> authFetch. Só a rede é simulada: o fetch global cai no backend em memória abaixo,
// que segue as regras do UserProfileController/Service da US23 (testes de backend no main).

// O mock global do setup cria um push novo a cada chamada: aqui ele é um só, para o teste poder conferi-lo
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}));

// --- fakeBackend: estado do usuário, da sessão e das fotos gravadas ---
interface StoredAccount {
  name: string;
  email: string;
  password: string;
  tokenVersion: number;
  profilePictureUrl: string | null;
}

interface RecordedRequest {
  method: string;
  url: string;
  authorization: string | null;
  contentType: string | null;
  json?: unknown;
  data?: unknown;
  dataType?: string;
  photo?: { name: string; size: number; type: string } | null;
}

let account: StoredAccount;
// Token válido de cada tokenVersion (a troca de senha revoga os anteriores)
let validTokens: Map<string, number>;
// Limite do multipart no Spring: 5MB quando configurado; o padrão do Spring, sem configuração, é 1MB
let backendUploadLimit: number;
let photosOnDisk: string[];
let requests: RecordedRequest[];
let holdNextProfileResponse: { release: () => void } | null;

function errorBody(status: number, message: string, extra: Record<string, unknown> = {}) {
  return { timestamp: new Date().toISOString(), status, error: "Bad Request", message, ...extra };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function isAuthenticated(authorization: string | null) {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  return validTokens.get(token) === account.tokenVersion;
}

async function handleProfile(form: FormData, request: RecordedRequest): Promise<Response> {
  const dataPart = form.get("data");
  const data = dataPart instanceof Blob ? JSON.parse(await readBlobText(dataPart)) : null;
  const photo = form.get("photo");
  request.data = data;
  request.dataType = dataPart instanceof Blob ? dataPart.type : undefined;
  request.photo = photo instanceof File ? { name: photo.name, size: photo.size, type: photo.type } : null;

  if (photo instanceof File && photo.size > backendUploadLimit) return json(400, errorBody(400, BACKEND_FILE_TOO_LARGE_TEXT));
  const name = typeof data?.name === "string" ? data.name : "";
  if (!name.trim()) return json(400, errorBody(400, "Validation failed", { errors: { name: NAME_REQUIRED_TEXT } }));
  if (photo instanceof File && photo.size > 0 && !["image/jpeg", "image/jpg", "image/png"].includes(photo.type)) {
    return json(400, errorBody(400, "Formato de arquivo inválido. Envie JPG ou PNG."));
  }

  account.name = name;
  if (photo instanceof File && photo.size > 0) {
    const url = `/fotosPerfil/foto-${photosOnDisk.length + 1}.${photo.type === "image/png" ? "png" : "jpg"}`;
    photosOnDisk.push(url);
    account.profilePictureUrl = url;
  }
  return json(200, { id: STORED_USER.id, name: account.name, email: account.email, profilePictureUrl: account.profilePictureUrl });
}

function handlePassword(body: { currentPassword?: string; newPassword?: string }): Response {
  if (body.currentPassword !== account.password) return json(400, errorBody(400, WRONG_CURRENT_PASSWORD_TEXT));
  if (body.newPassword === account.password) return json(400, errorBody(400, "A nova senha deve ser diferente da atual."));
  account.password = String(body.newPassword);
  account.tokenVersion += 1;
  return json(200, { message: PASSWORD_CHANGED_TEXT });
}

async function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const request: RecordedRequest = {
    method: (init.method ?? "GET").toUpperCase(),
    url: String(input),
    authorization: headers.get("Authorization"),
    contentType: headers.get("Content-Type"),
  };
  requests.push(request);

  if (!isAuthenticated(request.authorization)) return json(401, errorBody(401, "Unauthorized"));

  if (request.method === "PUT" && PROFILE_ROUTE.test(request.url) && init.body instanceof FormData) {
    if (holdNextProfileResponse) {
      const hold = holdNextProfileResponse;
      holdNextProfileResponse = null;
      await new Promise<void>((resolve) => (hold.release = resolve));
    }
    return handleProfile(init.body, request);
  }
  if (request.method === "PUT" && PASSWORD_ROUTE.test(request.url)) {
    request.json = JSON.parse(String(init.body));
    return handlePassword(request.json as { currentPassword?: string; newPassword?: string });
  }
  return json(404, errorBody(404, "Rota inexistente"));
}

function requestsTo(route: RegExp) {
  return requests.filter((request) => request.method === "PUT" && route.test(request.url));
}

// --- tela ---
const profileForm = () => within(screen.getByRole("form", { name: /perfil/i }));
const passwordForm = () => within(screen.getByRole("form", { name: /senha/i }));

function renderPage() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, applyAccept: false });
  render(<ProfilePage />);
  return {
    user,
    nameInput: () => profileForm().getByRole("textbox", { name: /^nome/i }),
    photoInput: () => profileForm().getByLabelText(/foto de perfil/i),
    saveButton: () => profileForm().getByRole("button", { name: /salvar/i }),
    currentInput: () => passwordForm().getByLabelText(/senha atual/i),
    newInput: () => passwordForm().getByLabelText(/nova senha/i),
    changeButton: () => passwordForm().getByRole("button", { name: /alterar senha/i }),
  };
}

async function saveProfile(name: string, photo: File | null) {
  const view = renderPage();
  await view.user.clear(view.nameInput());
  await view.user.type(view.nameInput(), name);
  if (photo) await view.user.upload(view.photoInput(), photo);
  await view.user.click(view.saveButton());
  return view;
}

async function changePassword(current: string, next: string) {
  const view = renderPage();
  await view.user.type(view.currentInput(), current);
  await view.user.type(view.newInput(), next);
  await view.user.click(view.changeButton());
  return view;
}

async function passRedirectWindow() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(MAX_REDIRECT_DELAY_MS);
  });
}

let urls: ReturnType<typeof stubObjectUrls>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  push.mockReset();
  account = {
    name: STORED_USER.name,
    email: STORED_USER.email,
    password: CURRENT_PASSWORD,
    tokenVersion: 1,
    profilePictureUrl: STORED_USER.profilePictureUrl,
  };
  validTokens = new Map([[STORED_TOKEN, 1]]);
  backendUploadLimit = MAX_PHOTO_BYTES;
  photosOnDisk = [];
  requests = [];
  holdNextProfileResponse = null;
  localStorage.clear();
  storeSession();
  urls = stubObjectUrls();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});

afterEach(() => {
  urls.restore();
  localStorage.clear();
  vi.useRealTimers();
});

describe("[US23] Integração da página de perfil — dados cadastrais e foto", () => {
  it("Deve abrir com os dados do usuário logado, sem chamar o backend", () => {
    const { nameInput } = renderPage();

    expect(nameInput()).toHaveValue(STORED_USER.name);
    expect(document.body).toHaveTextContent(STORED_USER.email);
    expect(requests).toHaveLength(0);
  });

  it("Deve salvar nome e foto em um único PUT multipart autenticado e refletir o novo perfil na sessão", async () => {
    const photo = validPhoto();

    await saveProfile(NEW_NAME, photo);

    expect(await profileForm().findByRole("status")).toHaveTextContent(PROFILE_SAVED_MESSAGE);
    const [sent] = requestsTo(PROFILE_ROUTE);
    expect(requestsTo(PROFILE_ROUTE)).toHaveLength(1);
    expect(sent.url).toBe("/api/v1/users/me/profile");
    expect(sent.authorization).toBe(`Bearer ${STORED_TOKEN}`);
    // O navegador gera o boundary: um Content-Type manual quebraria o multipart no Spring
    expect(sent.contentType).toBeNull();
    expect(sent.dataType).toBe("application/json");
    expect(sent.data).toEqual({ name: NEW_NAME });
    expect(sent.photo).toEqual({ name: photo.name, size: photo.size, type: photo.type });
    // Backend gravou e a sessão do front acompanhou
    expect(account.name).toBe(NEW_NAME);
    expect(photosOnDisk).toHaveLength(1);
    expect(storedUser()).toMatchObject({ id: STORED_USER.id, name: NEW_NAME, profilePictureUrl: account.profilePictureUrl });
  });

  it("Deve salvar só o nome, sem parte de foto, quando nenhuma foto foi escolhida", async () => {
    await saveProfile(NEW_NAME, null);

    await profileForm().findByRole("status");
    expect(requestsTo(PROFILE_ROUTE)[0].photo).toBeNull();
    expect(account.name).toBe(NEW_NAME);
    expect(account.profilePictureUrl).toBe(STORED_USER.profilePictureUrl);
  });

  it("Deve mostrar o preview na hora e o loading visual enquanto o backend processa o upload", async () => {
    // O fakeBackend segura a resposta até o teste liberar (a referência local sobrevive ao reset do backend)
    const hold = { release: () => undefined as void };
    holdNextProfileResponse = hold;
    const view = renderPage();

    await view.user.upload(view.photoInput(), validPhoto());
    // Preview instantâneo: antes de qualquer requisição
    expect(profileForm().getByRole("img", { name: /foto de perfil/i })).toHaveAttribute("src", "blob:preview-1");
    expect(requests).toHaveLength(0);

    await view.user.click(view.saveButton());
    expect(await profileForm().findByRole("progressbar")).toBeInTheDocument();
    expect(view.saveButton()).toBeDisabled();

    await act(async () => {
      hold.release();
    });
    await waitFor(() => expect(profileForm().queryByRole("progressbar")).not.toBeInTheDocument());
    expect(await profileForm().findByRole("status")).toHaveTextContent(PROFILE_SAVED_MESSAGE);
  });

  // --- PAYLOAD ACIMA DE 5MB ---

  it("Deve barrar a foto acima de 5MB no navegador: o arquivo nunca é enviado e salvar grava só o nome", async () => {
    const view = renderPage();

    await view.user.upload(view.photoInput(), oversizedPhoto());
    expect(profileForm().getByRole("alert")).toHaveTextContent(PHOTO_TOO_LARGE_MESSAGE);
    expect(urls.create).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);

    await view.user.clear(view.nameInput());
    await view.user.type(view.nameInput(), NEW_NAME);
    await view.user.click(view.saveButton());

    // A seleção inválida foi descartada: um único PUT, sem parte de foto
    expect(await profileForm().findByRole("status")).toHaveTextContent(PROFILE_SAVED_MESSAGE);
    const sent = requestsTo(PROFILE_ROUTE);
    expect(sent).toHaveLength(1);
    expect(sent[0].photo).toBeNull();
    expect(account.name).toBe(NEW_NAME);
    expect(photosOnDisk).toHaveLength(0);
    expect(account.profilePictureUrl).toBe(STORED_USER.profilePictureUrl);
  });

  it("Fronteira: deve enviar e gravar a foto com exatamente 5MB", async () => {
    const photo = exactLimitPhoto();

    await saveProfile(NEW_NAME, photo);

    expect(await profileForm().findByRole("status")).toHaveTextContent(PROFILE_SAVED_MESSAGE);
    expect(requestsTo(PROFILE_ROUTE)[0].photo?.size).toBe(MAX_PHOTO_BYTES);
    expect(photosOnDisk).toHaveLength(1);
  });

  it("Deve exibir a recusa de tamanho do backend sem alterar o perfil nem a sessão (multipart do Spring sem configuração: 1MB)", async () => {
    backendUploadLimit = 1024 * 1024;

    await saveProfile(NEW_NAME, makePhoto(2 * 1024 * 1024, "dois-mb.png", "image/png"));

    expect(await profileForm().findByRole("alert")).toHaveTextContent(SIZE_LIMIT_MESSAGE);
    expect(requestsTo(PROFILE_ROUTE)).toHaveLength(1);
    expect(account.name).toBe(STORED_USER.name);
    expect(photosOnDisk).toHaveLength(0);
    expect(storedUser()).toEqual(STORED_USER);
    expect(localStorage.getItem("token")).toBe(STORED_TOKEN);
    expect(profileForm().queryByRole("status")).not.toBeInTheDocument();
  });

  it("Deve barrar arquivo que não seja JPG ou PNG antes de enviar: salvar grava só o nome", async () => {
    const view = renderPage();

    await view.user.upload(view.photoInput(), pdfFile());
    expect(profileForm().getByRole("alert")).toHaveTextContent(PHOTO_INVALID_TYPE_MESSAGE);
    expect(requests).toHaveLength(0);

    await view.user.click(view.saveButton());

    await profileForm().findByRole("status");
    expect(requestsTo(PROFILE_ROUTE).map((request) => request.photo)).toEqual([null]);
    expect(photosOnDisk).toHaveLength(0);
  });

  it("Deve encerrar a sessão e levar ao login quando o backend recusa o token revogado (troca de senha em outro lugar)", async () => {
    // Outra sessão trocou a senha: o tokenVersion avançou e o token deste navegador ficou defasado
    account.tokenVersion = 2;

    await saveProfile(NEW_NAME, null);

    await waitFor(() => expect(push).toHaveBeenCalledWith(LOGIN_PAGE));
    expect(requestsTo(PROFILE_ROUTE)[0].authorization).toBe(`Bearer ${STORED_TOKEN}`);
    expect(account.name).toBe(STORED_USER.name);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("[US23] Integração da página de perfil — troca de senha", () => {
  it("Deve recusar a senha atual incorreta com o texto do backend, sem trocar a senha e sem encerrar a sessão", async () => {
    await changePassword(WRONG_PASSWORD, NEW_PASSWORD);

    expect((await passwordForm().findByRole("alert")).textContent?.trim()).toBe(WRONG_CURRENT_PASSWORD_TEXT);
    const sent = requestsTo(PASSWORD_ROUTE);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("/api/v1/users/me/password");
    expect(sent[0].authorization).toBe(`Bearer ${STORED_TOKEN}`);
    expect(sent[0].contentType).toMatch(/application\/json/);
    expect(sent[0].json).toEqual({ currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD });
    // Backend intacto: mesma senha e mesmo tokenVersion
    expect(account.password).toBe(CURRENT_PASSWORD);
    expect(account.tokenVersion).toBe(1);

    await passRedirectWindow();
    expect(localStorage.getItem("token")).toBe(STORED_TOKEN);
    expect(push).not.toHaveBeenCalled();
    // O erro de senha não vaza para o formulário de perfil
    expect(profileForm().queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve trocar a senha, encerrar a sessão revogada e levar ao login", async () => {
    await changePassword(CURRENT_PASSWORD, NEW_PASSWORD);

    expect((await passwordForm().findByRole("status")).textContent?.trim()).toBe(PASSWORD_CHANGED_TEXT);
    expect(account.password).toBe(NEW_PASSWORD);
    // O backend revogou o token usado até aqui
    expect(account.tokenVersion).toBe(2);
    expect(isAuthenticated(`Bearer ${STORED_TOKEN}`)).toBe(false);

    await passRedirectWindow();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(push).toHaveBeenCalledWith(LOGIN_PAGE);
  });

  it("Deve permitir corrigir a senha atual depois do erro e concluir a troca", async () => {
    const view = await changePassword(WRONG_PASSWORD, NEW_PASSWORD);
    expect(await passwordForm().findByRole("alert")).toBeInTheDocument();

    await view.user.clear(view.currentInput());
    await view.user.type(view.currentInput(), CURRENT_PASSWORD);
    // A nova senha pode ter sido mantida ou limpa pelo formulário: digita de novo
    await view.user.clear(view.newInput());
    await view.user.type(view.newInput(), NEW_PASSWORD);
    await view.user.click(view.changeButton());

    expect((await passwordForm().findByRole("status")).textContent?.trim()).toBe(PASSWORD_CHANGED_TEXT);
    expect(passwordForm().queryByRole("alert")).not.toBeInTheDocument();
    expect(requestsTo(PASSWORD_ROUTE)).toHaveLength(2);
    expect(account.password).toBe(NEW_PASSWORD);
  });

  it("Não deve chamar o backend quando a nova senha é igual à atual", async () => {
    await changePassword(CURRENT_PASSWORD, CURRENT_PASSWORD);

    expect(await passwordForm().findByRole("alert")).toBeInTheDocument();
    expect(requestsTo(PASSWORD_ROUTE)).toHaveLength(0);
    expect(account.tokenVersion).toBe(1);
  });
});
