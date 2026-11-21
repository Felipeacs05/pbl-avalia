import { expect, request as apiRequest, test, type APIRequestContext, type Page, type Response } from "@playwright/test";

// Objetivo da US22: o usuário com e-mail não verificado pode estar logado, mas não cria nem ingressa em salas;
// o front o leva a /verify-email e, confirmado o código enviado no cadastro, as salas ficam liberadas.
// Tudo passa pelo backend real (perfil e2e, que autentica pelo header X-User-Id): nenhuma rota é simulada.

// Páginas
const VERIFY_EMAIL_PAGE = /\/verify-email(\?.*)?$/;
const TEACHER_ROOMS_PAGE = /\/teacher-rooms$/;
const joinByLinkPage = (code: string) => `/app/join/${encodeURIComponent(code)}`;

// Rotas do backend (AuthController e RoomController ficam em /api/v1)
const VERIFY_ROUTE = /\/api\/v1\/auth\/verify-email$/;
const RESEND_ROUTE = /\/api\/v1\/auth\/resend-verification$/;
const ROOMS_ROUTE = /\/api\/v1\/rooms$/;
const JOIN_ROUTE = /\/api\/v1\/rooms\/join$/;
const ROOMS_API = "/api/v1/rooms";

// COMBINAR COM O BACK-END: mesmo código fixado nos testes unitários (tests/US22/fixtures.ts)
const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";
const INVALID_CODE_MESSAGE = /código inválido ou expirado/i;
const CREATED_TOAST = /sala criada com sucesso/i;
const JOINED_TEXT = /você entrou na sala/i;
// O hook pode aguardar até 3 s mostrando a confirmação antes de navegar
const REDIRECT_TIMEOUT = 10_000;

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

// Lidas sob demanda: uma variável ausente falha com esta mensagem, e não com um X-User-Id vazio (401)
const env = {
  pendingUserId: () => requiredEnv("E2E_PENDING_USER_ID", "the UUID of a user whose e-mail is NOT verified, used only by this spec (verified by it: use a new one on each run)"),
  pendingEmail: () => requiredEnv("E2E_PENDING_EMAIL", "the e-mail of E2E_PENDING_USER_ID"),
  verificationCode: () => requiredEnv("E2E_VERIFICATION_CODE", "an unused verification code of E2E_PENDING_EMAIL expiring in the future (consumed by this spec)"),
  expiredCode: () => requiredEnv("E2E_EXPIRED_VERIFICATION_CODE", "an unused verification code of E2E_PENDING_EMAIL whose expiry date is in the past"),
  resendUserId: () => requiredEnv("E2E_RESEND_USER_ID", "the UUID of another user whose e-mail is NOT verified, used only by the resend test"),
  resendEmail: () => requiredEnv("E2E_RESEND_EMAIL", "the e-mail of E2E_RESEND_USER_ID"),
  tutorId: () => requiredEnv("E2E_TUTOR_ID", "the UUID of the seeded (verified) tutor"),
};

// Salas criadas pela spec, removidas no afterEach pelo dono de cada uma (como na US03)
const createdRooms: Array<{ id: string; ownerId: string }> = [];

// A ordem do arquivo importa (o config roda sem paralelismo): os bloqueios e o código expirado são conferidos
// antes da jornada, que consome E2E_VERIFICATION_CODE e torna o usuário verificado. O reenvio usa outro usuário,
// porque invalida os códigos anteriores.

test.beforeAll(() => {
  Object.values(env).forEach((read) => read());
});

test.afterEach(async ({ baseURL }) => {
  for (const { id, ownerId } of createdRooms.splice(0)) {
    const api = await apiAs(baseURL, ownerId);
    await api.delete(`${ROOMS_API}/${id}`).catch(() => undefined);
    await api.dispose();
  }
});

function apiAs(baseURL: string | undefined, userId: string): Promise<APIRequestContext> {
  return apiRequest.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": userId } });
}

// No e2e o backend autentica pelo X-User-Id. No navegador, o front precisa da sessão como o login da US02
// a deixa: o perfil (de onde a tela tira o e-mail) e um token (sem ele, /app/join manda para o login).
// O perfil e2e não valida JWT, então o token é só simbólico.
async function signInAs(page: Page, id: string, email: string) {
  await page.addInitScript(
    (session) => {
      localStorage.setItem("token", session.token);
      localStorage.setItem("user", JSON.stringify(session.user));
    },
    { token: `e2e-token-${id}`, user: { id, name: "Usuário Pendente E2E", email } },
  );
}

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function invalidCodeAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: INVALID_CODE_MESSAGE });
}

// Comunicação: as chamadas do axios precisam sair para o mesmo backend do e2e (rewrite /api/* do Next),
// e não para o padrão http://localhost:8080 do api.ts. Falha aqui = servidor reaproveitado sem NEXT_PUBLIC_API_URL
function expectSameOriginAsFront(response: Response, baseURL: string | undefined) {
  expect(new URL(response.url()).origin, "o axios deve usar NEXT_PUBLIC_API_URL=/api/v1 no e2e").toBe(new URL(baseURL!).origin);
}

// O usuário ainda está bloqueado? Conferido direto no filtro de segurança do backend, fora da tela
async function createRoomByApi(api: APIRequestContext, ownerId: string, name: string) {
  const response = await api.post(ROOMS_API, { data: { name } });
  const body = await response.json().catch(() => null);
  if (response.status() === 201) createdRooms.push({ id: String(body.id), ownerId });
  return { status: response.status(), body };
}

// Sala nova do tutor do seed, só para esta spec: não altera a turma compartilhada com as outras specs
async function freshTutorRoom(baseURL: string | undefined, name: string) {
  const api = await apiAs(baseURL, env.tutorId());
  const { status, body } = await createRoomByApi(api, env.tutorId(), name);
  await api.dispose();
  expect(status, "o tutor do seed precisa estar verificado para criar salas").toBe(201);
  return { id: String(body.id), code: String(body.code) };
}

async function memberIdsOf(baseURL: string | undefined, roomId: string): Promise<string[]> {
  const api = await apiAs(baseURL, env.tutorId());
  const members = (await (await api.get(`${ROOMS_API}/${roomId}/members`)).json()) as Array<{ id: string }>;
  await api.dispose();
  return members.map((member) => String(member.id));
}

async function createRoomThroughPage(page: Page, name: string): Promise<Response> {
  await page.goto("/teacher-rooms");
  await page.getByRole("button", { name: /criar nova sala/i }).click();
  await page.getByRole("textbox", { name: /nome da sala/i }).fill(name);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && ROOMS_ROUTE.test(res.url())),
    page.getByRole("button", { name: /^criar$/i }).click(),
  ]);
  expect(response.request().postDataJSON()).toEqual({ name });
  return response;
}

async function joinThroughLink(page: Page, code: string): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && JOIN_ROUTE.test(res.url())),
    page.goto(joinByLinkPage(code)),
  ]);
  expect(response.request().postDataJSON()).toEqual({ accessCode: code.toUpperCase() });
  return response;
}

// Digita o código e espera o POST real; a URL da API é derivada do tráfego do frontend
async function submitCode(page: Page, code: string): Promise<Response> {
  await page.getByLabel(/código/i).fill(code);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && VERIFY_ROUTE.test(res.url())),
    page.getByRole("button", { name: /^(verificar|confirmar)/i }).click(),
  ]);
  return response;
}

test.describe("[US22] usuário com e-mail pendente", () => {
  // Autenticado como o pendente, e não como o tutor que o config usa por padrão
  // eslint-disable-next-line no-empty-pattern -- assinatura de fixture do Playwright
  test.use({ extraHTTPHeaders: async ({}, use) => use({ "X-User-Id": env.pendingUserId() }) });

  test.beforeEach(async ({ page }) => {
    await signInAs(page, env.pendingUserId(), env.pendingEmail());
  });

  test("[E2E][US22] Pendente tenta criar sala, o backend recusa com 403 e ele é levado à verificação", async ({ page, request }) => {
    const roomName = `QA US22 Bloqueada ${Date.now()}`;

    const response = await createRoomThroughPage(page, roomName);

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ code: EMAIL_NOT_VERIFIED_CODE });
    await expect(page).toHaveURL(VERIFY_EMAIL_PAGE);
    // A tela de destino é a da US: mostra para onde o código foi enviado e oferece o reenvio
    await expect(page.getByText(env.pendingEmail()).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /reenviar e-mail/i })).toBeVisible();
    // Nada foi gravado: a sala não existe para o usuário
    const rooms = (await (await request.get(ROOMS_API)).json()) as Array<{ name: string }>;
    expect(rooms.map((room) => room.name)).not.toContain(roomName);
  });

  test("[E2E][US22] Pendente abre um link de convite, o backend recusa o ingresso e ele é levado à verificação", async ({ page, baseURL }) => {
    const room = await freshTutorRoom(baseURL, `QA US22 Convite ${Date.now()}`);

    const response = await joinThroughLink(page, room.code);

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ code: EMAIL_NOT_VERIFIED_CODE });
    await expect(page).toHaveURL(VERIFY_EMAIL_PAGE);
    await expect(page.getByText(JOINED_TEXT)).toHaveCount(0);
    // Não virou membro: conferido na turma, pelo tutor
    expect(await memberIdsOf(baseURL, room.id)).not.toContain(env.pendingUserId());
  });

  test("[E2E][US22] Código expirado é recusado com 403 na tela, sem recarregar, e o usuário continua bloqueado", async ({ page, request, baseURL }) => {
    await page.goto("/verify-email");
    // Toda navegação a partir do envio: o 403 desta tela não pode acionar o redirecionamento do interceptor
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    const response = await submitCode(page, env.expiredCode());

    expectSameOriginAsFront(response, baseURL);
    expect(response.status()).toBe(403);
    expect(response.request().postDataJSON()).toEqual({ email: env.pendingEmail(), code: env.expiredCode() });
    await expect(invalidCodeAlert(page)).toBeVisible();
    await expect(page).toHaveURL(VERIFY_EMAIL_PAGE);
    expect(navigations).toEqual([]);
    // Uma recusa que confirmasse a conta mesmo assim liberaria a criação de sala
    const blocked = await createRoomByApi(request, env.pendingUserId(), `QA US22 Expirado ${Date.now()}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body).toMatchObject({ code: EMAIL_NOT_VERIFIED_CODE });
  });

  test("[E2E][US22] Pendente confirma o código do cadastro, volta às salas e passa a criar e ingressar em salas na mesma sessão", async ({ page, request, baseURL }) => {
    // Sem esta pré-condição, os sucessos abaixo passariam mesmo com E2E_PENDING_USER_ID já verificado
    const before = await createRoomByApi(request, env.pendingUserId(), `QA US22 Pré ${Date.now()}`);
    expect(before.status, "E2E_PENDING_USER_ID precisa estar pendente").toBe(403);

    // 1. Confirma o código
    await page.goto("/verify-email");
    const response = await submitCode(page, env.verificationCode());

    expectSameOriginAsFront(response, baseURL);
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({ email: env.pendingEmail(), code: env.verificationCode() });
    // A tela mostra exatamente o texto do backend
    const { message } = (await response.json()) as { message: string };
    await expect(page.getByRole("status")).toHaveText(message);
    await expect(page).toHaveURL(TEACHER_ROOMS_PAGE, { timeout: REDIRECT_TIMEOUT });

    // 2. Criar sala, pela tela, agora passa
    const roomName = `QA US22 Liberada ${Date.now()}`;
    const created = await createRoomThroughPage(page, roomName);

    expect(created.status()).toBe(201);
    createdRooms.push({ id: String((await created.json()).id), ownerId: env.pendingUserId() });
    await expect(page.getByText(CREATED_TOAST)).toBeVisible();
    await expect(page).toHaveURL(TEACHER_ROOMS_PAGE);

    // 3. Ingressar pelo link de convite, agora passa
    const room = await freshTutorRoom(baseURL, `QA US22 Convite Liberado ${Date.now()}`);
    const joined = await joinThroughLink(page, room.code);

    expect(joined.status()).toBe(200);
    await expect(page.getByText(JOINED_TEXT)).toBeVisible();
    expect(await memberIdsOf(baseURL, room.id)).toContain(env.pendingUserId());
    await expect(page).not.toHaveURL(VERIFY_EMAIL_PAGE);
  });
});

test.describe("[US22] reenvio do código", () => {
  // eslint-disable-next-line no-empty-pattern -- assinatura de fixture do Playwright
  test.use({ extraHTTPHeaders: async ({}, use) => use({ "X-User-Id": env.resendUserId() }) });

  test("[E2E][US22] Reenviar e-mail emite um novo código, mostra a confirmação e não libera as salas", async ({ page, request, baseURL }) => {
    await signInAs(page, env.resendUserId(), env.resendEmail());
    await page.goto("/verify-email");

    // Toda requisição à API a partir do clique: só o reenvio, nenhuma verificação junto
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname.startsWith("/api/")) apiCalls.push(req.url());
    });
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "POST" && RESEND_ROUTE.test(res.url())),
      page.getByRole("button", { name: /reenviar e-mail/i }).click(),
    ]);

    expectSameOriginAsFront(response, baseURL);
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({ email: env.resendEmail() });
    const { message } = (await response.json()) as { message: string };
    await expect(page.getByRole("status")).toHaveText(message);
    expect(apiCalls).toHaveLength(1);
    await expect(page).toHaveURL(VERIFY_EMAIL_PAGE);
    // Reenviar não confirma a conta
    expect((await createRoomByApi(request, env.resendUserId(), `QA US22 Reenvio ${Date.now()}`)).status).toBe(403);
  });
});
