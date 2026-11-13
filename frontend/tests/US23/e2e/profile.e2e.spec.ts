import { expect, request as apiRequest, test, type APIRequestContext, type Page, type Request, type Response } from "@playwright/test";

// Objetivo da US23: o usuário logado altera nome, foto (JPG/PNG até 5MB, com preview e loading visual) e senha,
// esta última só com a senha atual correta. QA: senha atual incorreta e payload acima de 5MB.
// Tudo passa pelo backend real (perfil e2e, que autentica pelo header X-User-Id): nenhuma resposta é simulada.
//
// Execução (frontend/playwright.config.ts + tests/global-setup.e2e.ts):
//   docker compose -f docker-compose.e2e.yml up   -> backend em :8081 no perfil e2e
//   npm run test:e2e                               -> sobe o Next em :3001 e chama o seed
// O seed grava a senha "e2e-<run>" e não a exporta: por isso cada teste cria o próprio usuário pelas rotas
// públicas de cadastro e login (liberadas no E2eSecurityConfig). A spec não precisa de variáveis novas e não
// troca a senha de usuários compartilhados com outras specs.

// Páginas
const PROFILE_PAGE = "/profile";
// Login da US02 fica na raiz; comparar o caminho funciona com ou sem porta em E2E_BASE_URL
const isLoginPage = (url: URL) => url.pathname === "/";
const isProfilePage = (url: URL) => url.pathname === PROFILE_PAGE;

// Rotas do backend
const PROFILE_ROUTE = /\/api\/v1\/users\/me\/profile$/;
const PASSWORD_ROUTE = /\/api\/v1\/users\/me\/password$/;
const PROFILE_API = "/api/v1/users/me/profile";
const REGISTER_API = "/api/v1/auth/register";
const LOGIN_API = "/api/v1/auth/login";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const INITIAL_PASSWORD = "SenhaForte@2026";
const NEW_PASSWORD = "NovaSenhaForte@2027";
const WRONG_PASSWORD = "SenhaErrada@0000";
// Textos do backend (UserProfileService/GlobalExceptionHandler da US23)
const WRONG_CURRENT_PASSWORD_TEXT = "Senha atual incorreta.";
const PASSWORD_CHANGED_TEXT = "Senha alterada com sucesso.";
// Textos do front (mesmos dos testes unitários: tests/US23/fixtures.ts)
const PROFILE_SAVED_MESSAGE = /perfil atualizado/i;
const PHOTO_TOO_LARGE_MESSAGE = /excede o limite de 5\s?MB/i;
const PHOTO_INVALID_TYPE_MESSAGE = /jpg ou png/i;
const SIZE_LIMIT_MESSAGE = /5\s?MB/i;
// O hook pode aguardar até 3 s mostrando a confirmação antes de ir ao login
const REDIRECT_TIMEOUT = 10_000;

// PNG 1x1 válido: o navegador consegue desenhar, o que prova que a URL devolvida serve a imagem
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

// Arquivo com o tamanho exato pedido, começando por um PNG válido (o restante são bytes de preenchimento)
function pngOfSize(bytes: number) {
  return Buffer.concat([TINY_PNG, Buffer.alloc(Math.max(0, bytes - TINY_PNG.length))]);
}

interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
}

// O usuário do teste se autentica pelo X-User-Id que cada chamada declara; o tutor padrão do config não entra
test.use({ extraHTTPHeaders: {} });

function newContext(baseURL: string | undefined, userId?: string): Promise<APIRequestContext> {
  return apiRequest.newContext({ baseURL, extraHTTPHeaders: userId ? { "X-User-Id": userId } : {} });
}

async function registerAccount(baseURL: string | undefined): Promise<Account> {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const account = { name: `QA US23 ${unique}`, email: `qa.us23.${unique}@uefs.br`, password: INITIAL_PASSWORD };
  const api = await newContext(baseURL);
  // Mesmo formato do cadastro da US01: parte "data" com o JSON
  const response = await api.post(REGISTER_API, {
    multipart: {
      data: {
        name: "data.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ name: account.name, email: account.email, password: account.password })),
      },
    },
  });
  const body = await response.json().catch(() => null);
  await api.dispose();
  expect(response.status(), `cadastro do usuário de teste: ${JSON.stringify(body)}`).toBe(201);
  return { ...account, id: String(body.id) };
}

async function login(baseURL: string | undefined, email: string, password: string) {
  const api = await newContext(baseURL);
  const response = await api.post(LOGIN_API, { data: { email, password } });
  const body = await response.json().catch(() => null);
  await api.dispose();
  return { status: response.status(), body };
}

// Deixa no navegador a mesma sessão que o login da US02 deixa (token + user) e autentica o tráfego da página
async function openProfileAs(page: Page, baseURL: string | undefined, account: Account) {
  const { status, body } = await login(baseURL, account.email, account.password);
  expect(status, "login do usuário de teste").toBe(200);
  await page.setExtraHTTPHeaders({ "X-User-Id": account.id });
  await page.addInitScript(
    (session) => {
      localStorage.setItem("token", session.token);
      localStorage.setItem("user", JSON.stringify(session.user));
    },
    { token: String(body.token), user: body.user ?? { id: account.id, name: account.name, email: account.email } },
  );
  await page.goto(PROFILE_PAGE);
}

// Estado gravado no backend, lido por um novo login (o UserResponse do login traz nome e foto)
async function storedProfile(baseURL: string | undefined, account: Account, password = account.password) {
  const { status, body } = await login(baseURL, account.email, password);
  expect(status).toBe(200);
  return body.user as { name: string; profilePictureUrl: string | null };
}

const profileForm = (page: Page) => page.getByRole("form", { name: /perfil/i });
const passwordForm = (page: Page) => page.getByRole("form", { name: /senha/i });

// Toda requisição de perfil que levou uma parte "photo"
function trackPhotoUploads(page: Page) {
  const uploads: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "PUT" && PROFILE_ROUTE.test(req.url()) && (req.postDataBuffer()?.includes('name="photo"') ?? false)) {
      uploads.push(req);
    }
  });
  return uploads;
}

async function saveThroughPage(page: Page, name: string, photo?: { name: string; mimeType: string; buffer: Buffer }): Promise<Response> {
  const form = profileForm(page);
  await form.getByRole("textbox", { name: /^nome/i }).fill(name);
  if (photo) await form.getByLabel(/foto de perfil/i).setInputFiles(photo);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PUT" && PROFILE_ROUTE.test(res.url())),
    form.getByRole("button", { name: /salvar/i }).click(),
  ]);
  return response;
}

async function changePasswordThroughPage(page: Page, current: string, next: string): Promise<Response> {
  const form = passwordForm(page);
  await form.getByLabel(/senha atual/i).fill(current);
  await form.getByLabel(/nova senha/i).fill(next);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PUT" && PASSWORD_ROUTE.test(res.url())),
    form.getByRole("button", { name: /alterar senha/i }).click(),
  ]);
  return response;
}

// Comunicação: o front chama caminhos relativos /api/v1 (rewrite do Next para o backend do e2e)
function expectSameOriginAsFront(response: Response, baseURL: string | undefined) {
  expect(new URL(response.url()).origin, "a chamada deve passar pelo rewrite /api/* do Next").toBe(new URL(baseURL!).origin);
}

test.describe("[US23] edição de nome e foto", () => {
  test("[E2E][US23] Salva nome e foto com preview e loading visual, e a nova foto passa a ser servida", async ({ page, baseURL }) => {
    const account = await registerAccount(baseURL);
    await openProfileAs(page, baseURL, account);
    // Atrasa (sem alterar) a ida ao backend, para o loading visual ser observável
    await page.route(PROFILE_ROUTE, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    const newName = `${account.name} Atualizado`;

    const form = profileForm(page);
    await form.getByLabel(/foto de perfil/i).setInputFiles({ name: "perfil.png", mimeType: "image/png", buffer: TINY_PNG });
    // Preview instantâneo, antes de salvar
    await expect(form.getByRole("img", { name: /foto de perfil/i })).toHaveAttribute("src", /^blob:/);

    await form.getByRole("textbox", { name: /^nome/i }).fill(newName);
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "PUT" && PROFILE_ROUTE.test(res.url())),
      (async () => {
        await form.getByRole("button", { name: /salvar/i }).click();
        await expect(form.getByRole("progressbar")).toBeVisible();
      })(),
    ]);

    expectSameOriginAsFront(response, baseURL);
    expect(response.status()).toBe(200);
    expect(await response.request().headerValue("content-type")).toMatch(/^multipart\/form-data; boundary=/);
    const sentBody = response.request().postDataBuffer()?.toString("latin1") ?? "";
    expect(sentBody).toContain('name="data"');
    expect(sentBody).toContain('name="photo"');
    const updated = (await response.json()) as { name: string; profilePictureUrl: string };
    expect(updated.name).toBe(newName);
    expect(updated.profilePictureUrl).toContain("/fotosPerfil/");

    await expect(form.getByRole("progressbar")).toBeHidden();
    await expect(form.getByRole("status")).toHaveText(PROFILE_SAVED_MESSAGE);
    // Gravado no backend
    expect(await storedProfile(baseURL, account)).toMatchObject({ name: newName, profilePictureUrl: updated.profilePictureUrl });
    // A foto devolvida precisa carregar a partir do front (o Next só reescreve /api/*)
    await page.reload();
    const avatar = profileForm(page).getByRole("img", { name: /foto de perfil/i });
    await expect
      .poll(() => avatar.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)), {
        message: "a foto em /fotosPerfil/** precisa carregar pelo front (rewrite ou URL do backend)",
      })
      .toBeGreaterThan(0);
  });

  test("[E2E][US23] Foto acima de 5MB é barrada no navegador: o arquivo não sai e salvar grava só o nome", async ({ page, baseURL }) => {
    const account = await registerAccount(baseURL);
    await openProfileAs(page, baseURL, account);
    const uploads = trackPhotoUploads(page);
    const form = profileForm(page);
    const newName = `${account.name} Sem Foto`;

    await form.getByLabel(/foto de perfil/i).setInputFiles({
      name: "gigante.png",
      mimeType: "image/png",
      buffer: pngOfSize(MAX_PHOTO_BYTES + 1),
    });
    await expect(form.getByRole("alert")).toHaveText(PHOTO_TOO_LARGE_MESSAGE);
    // Sem preview do arquivo recusado (o usuário novo pode nem ter <img>, só iniciais)
    await expect(form.locator('img[src^="blob:"]')).toHaveCount(0);

    // A seleção inválida foi descartada: salvar envia o nome, sem a parte "photo"
    const response = await saveThroughPage(page, newName);

    expect(response.status()).toBe(200);
    await expect(form.getByRole("status")).toHaveText(PROFILE_SAVED_MESSAGE);
    expect(uploads).toHaveLength(0);
    expect(await storedProfile(baseURL, account)).toMatchObject({ name: newName, profilePictureUrl: null });
  });

  test("[E2E][US23] Fronteira: foto com exatamente 5MB é aceita pelo front e pelo backend", async ({ page, baseURL }) => {
    const account = await registerAccount(baseURL);
    await openProfileAs(page, baseURL, account);

    const response = await saveThroughPage(page, account.name, {
      name: "limite.png",
      mimeType: "image/png",
      buffer: pngOfSize(MAX_PHOTO_BYTES),
    });

    // Falha aqui com 400 "File exceeds maximum upload limit of 5MB" = spring.servlet.multipart.max-file-size não
    // configurado no backend (padrão do Spring: 1MB)
    expect(response.status(), await response.text()).toBe(200);
    await expect(profileForm(page).getByRole("status")).toHaveText(PROFILE_SAVED_MESSAGE);
    expect((await storedProfile(baseURL, account)).profilePictureUrl).toContain("/fotosPerfil/");
  });

  test("[E2E][US23] Arquivo que não é JPG nem PNG é barrado no navegador e não é enviado", async ({ page, baseURL }) => {
    const account = await registerAccount(baseURL);
    await openProfileAs(page, baseURL, account);
    const uploads = trackPhotoUploads(page);
    const form = profileForm(page);

    await form.getByLabel(/foto de perfil/i).setInputFiles({
      name: "documento.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 conteudo"),
    });
    await expect(form.getByRole("alert")).toHaveText(PHOTO_INVALID_TYPE_MESSAGE);

    const response = await saveThroughPage(page, account.name);

    expect(response.status()).toBe(200);
    expect(uploads).toHaveLength(0);
    expect((await storedProfile(baseURL, account)).profilePictureUrl).toBeNull();
  });

  test("[E2E][US23] Payload acima de 5MB enviado sem o front (pela mesma rota) é recusado pelo backend sem alterar o perfil", async ({ baseURL }) => {
    const account = await registerAccount(baseURL);
    const api = await newContext(baseURL, account.id);

    const response = await api.put(PROFILE_API, {
      multipart: {
        data: { name: "data.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ name: "Nome Invasor" })) },
        photo: { name: "gigante.png", mimeType: "image/png", buffer: pngOfSize(MAX_PHOTO_BYTES + 1) },
      },
    });
    const body = await response.json().catch(() => null);
    await api.dispose();

    expect(response.status()).toBe(400);
    expect(String(body?.message)).toMatch(SIZE_LIMIT_MESSAGE);
    // Atomicidade: nem a foto nem o nome mudaram
    expect(await storedProfile(baseURL, account)).toMatchObject({ name: account.name, profilePictureUrl: null });
  });
});

test.describe("[US23] troca de senha", () => {
  test("[E2E][US23] Senha atual incorreta é recusada com 400, o alerta aparece e nada muda", async ({ page, baseURL }) => {
    const account = await registerAccount(baseURL);
    await openProfileAs(page, baseURL, account);

    const response = await changePasswordThroughPage(page, WRONG_PASSWORD, NEW_PASSWORD);

    expectSameOriginAsFront(response, baseURL);
    expect(response.status()).toBe(400);
    expect(response.request().postDataJSON()).toEqual({ currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD });
    expect(await response.json()).toMatchObject({ message: WRONG_CURRENT_PASSWORD_TEXT });
    // A tela mostra exatamente o texto do backend, no formulário de senha
    await expect(passwordForm(page).getByRole("alert")).toHaveText(WRONG_CURRENT_PASSWORD_TEXT);
    await expect(profileForm(page).getByRole("alert")).toHaveCount(0);
    // Continua logado na mesma página
    await expect(page).toHaveURL(isProfilePage);
    expect(await page.evaluate(() => localStorage.getItem("token"))).not.toBeNull();
    // A senha no backend é a mesma
    expect((await login(baseURL, account.email, INITIAL_PASSWORD)).status).toBe(200);
    expect((await login(baseURL, account.email, NEW_PASSWORD)).status).toBe(401);
  });

  test("[E2E][US23] Senha atual correta troca a senha, encerra a sessão e só a nova senha entra", async ({ page, baseURL }) => {
    const account = await registerAccount(baseURL);
    await openProfileAs(page, baseURL, account);

    const response = await changePasswordThroughPage(page, INITIAL_PASSWORD, NEW_PASSWORD);

    expectSameOriginAsFront(response, baseURL);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ message: PASSWORD_CHANGED_TEXT });
    await expect(passwordForm(page).getByRole("status")).toHaveText(PASSWORD_CHANGED_TEXT);
    // O backend revoga o token atual: o front encerra a sessão e leva ao login
    await expect(page).toHaveURL(isLoginPage, { timeout: REDIRECT_TIMEOUT });
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    // Só a nova senha autentica
    expect((await login(baseURL, account.email, INITIAL_PASSWORD)).status).toBe(401);
    expect((await login(baseURL, account.email, NEW_PASSWORD)).status).toBe(200);
  });
});
