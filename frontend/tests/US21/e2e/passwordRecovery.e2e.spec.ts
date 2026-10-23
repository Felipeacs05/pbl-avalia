import { expect, test, type APIRequestContext, type Page, type Response } from "@playwright/test";

// Rotas das páginas da US21 (o teste de backend não fixa o formato do link enviado por e-mail)
const FORGOT_PASSWORD_PAGE = "/forgot-password";
const resetPasswordPage = (token: string) => `/reset-password?token=${encodeURIComponent(token)}`;

// Rotas do teste de backend da US21 (sem o prefixo /api/v1)
const RECOVER_ROUTE = /\/api\/auth\/password\/recover$/;
const RESET_ROUTE = /\/api\/auth\/password\/reset$/;
const LOGIN_ROUTE = "/api/v1/auth/login";

const RECOVERY_TEXT = "Se o e-mail estiver cadastrado, você receberá um link de recuperação.";
const RESET_SUCCESS_MESSAGE = /senha redefinida com sucesso/i;
const INVALID_TOKEN_TEXT = "Token inválido ou expirado.";
const INVALID_TOKEN_MESSAGE = /token inválido ou expirado/i;

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let email: string;
let originalPassword: string;
let resetToken: string;
let expiredToken: string;

// Quem esqueceu a senha não está logado: sem o X-User-Id que o config envia por padrão.
// Assim o teste também prova que as rotas da US21 são públicas
test.use({ extraHTTPHeaders: {} });

// A ordem do arquivo importa (o config roda sem paralelismo): a jornada consome E2E_RESET_TOKEN antes que o
// pedido de link do último teste emita um token novo, que poderia invalidar os anteriores

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function invalidTokenAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: INVALID_TOKEN_MESSAGE });
}

// A senha vale de fato? Conferido pelo login da US02 (considerado resolvido), que devolve 401 na senha errada
async function loginStatus(request: APIRequestContext, password: string): Promise<number> {
  const response = await request.post(LOGIN_ROUTE, { data: { email, password } });
  return response.status();
}

// Preenche a nova senha e espera o POST real; a URL da API é derivada do tráfego do frontend
async function submitNewPassword(page: Page, token: string, newPassword: string): Promise<Response> {
  await page.goto(resetPasswordPage(token));
  await page.getByLabel(/nova senha/i).fill(newPassword);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && RESET_ROUTE.test(res.url())),
    page.getByRole("button", { name: /redefinir senha/i }).click(),
  ]);
  expect(response.request().postDataJSON()).toEqual({ token, newPassword });
  return response;
}

test.beforeAll(() => {
  email = requiredEnv("E2E_RESET_EMAIL", "the e-mail of a registered user used only by this spec");
  originalPassword = requiredEnv("E2E_RESET_PASSWORD", "the current password of E2E_RESET_EMAIL");
  resetToken = requiredEnv(
    "E2E_RESET_TOKEN",
    "an unused password reset token of E2E_RESET_EMAIL expiring in the future (consumed by this spec: use a new one on each run)",
  );
  expiredToken = requiredEnv(
    "E2E_EXPIRED_RESET_TOKEN",
    "an unused password reset token of E2E_RESET_EMAIL whose expiry date is in the past",
  );
});

test("[E2E][US21] Usuário redefine a senha pelo link, entra com a nova senha e o mesmo link é recusado na segunda vez", async ({ page, request }) => {
  const newPassword = `NovaSenha-${Date.now()}`;
  // Sem esta pré-condição, o 401 da senha antiga passaria mesmo com E2E_RESET_PASSWORD desatualizada
  expect(await loginStatus(request, originalPassword), "E2E_RESET_PASSWORD precisa ser a senha atual").toBe(200);

  const response = await submitNewPassword(page, resetToken, newPassword);

  expect(response.status()).toBe(200);
  await expect(page.getByRole("status")).toHaveText(RESET_SUCCESS_MESSAGE);
  // O token é de uso único: depois do sucesso a tela não oferece novo envio
  await expect(page.getByRole("button", { name: /redefinir senha/i })).toHaveCount(0);
  // A nova senha passou a valer e a antiga deixou de valer
  expect(await loginStatus(request, newPassword)).toBe(200);
  expect(await loginStatus(request, originalPassword)).toBe(401);

  // As sessões anteriores foram invalidadas no backend: o caminho é entrar de novo
  await page.getByRole("link", { name: /login/i }).click();
  await expect(page).toHaveURL(/\/$/);

  // Mesmo link, senha diferente: se a segunda gravação acontecesse, ela passaria a valer no login
  const otherPassword = `OutraSenha-${Date.now()}`;
  const reuse = await submitNewPassword(page, resetToken, otherPassword);

  expect(reuse.status()).toBe(400);
  expect(await reuse.json()).toMatchObject({ error: INVALID_TOKEN_TEXT });
  await expect(invalidTokenAlert(page)).toBeVisible();
  expect(await loginStatus(request, otherPassword)).toBe(401);
  expect(await loginStatus(request, newPassword)).toBe(200);
});

test("[E2E][US21] Link expirado é recusado na tela e a senha enviada não passa a valer", async ({ page, request }) => {
  const refusedPassword = `Recusada-${Date.now()}`;

  const response = await submitNewPassword(page, expiredToken, refusedPassword);

  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ error: INVALID_TOKEN_TEXT });
  await expect(invalidTokenAlert(page)).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  // Uma recusa que gravasse mesmo assim faria esta senha valer
  expect(await loginStatus(request, refusedPassword)).toBe(401);
});

test("[E2E][US21] Pedido de link tem a mesma resposta na API e na tela para e-mail cadastrado e não cadastrado", async ({ page }) => {
  const unregisteredEmail = `naoexiste-${Date.now()}@avalia.test`;
  const outcomes: Array<{ status: number; body: unknown; screen: string | null }> = [];

  for (const typedEmail of [email, unregisteredEmail]) {
    await page.goto(FORGOT_PASSWORD_PAGE);
    await page.getByLabel(/e-mail/i).fill(typedEmail);

    // Toda requisição à API a partir do envio: nenhuma consulta prévia de existência da conta
    const apiCalls: string[] = [];
    const track = (req: { url(): string }) => {
      if (new URL(req.url()).pathname.startsWith("/api/")) apiCalls.push(req.url());
    };
    page.on("request", track);
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "POST" && RECOVER_ROUTE.test(res.url())),
      page.getByRole("button", { name: /enviar link/i }).click(),
    ]);
    await expect(page.getByRole("status")).toBeVisible();

    page.off("request", track);
    expect(response.request().postDataJSON()).toEqual({ email: typedEmail });
    expect(apiCalls).toHaveLength(1);
    outcomes.push({
      status: response.status(),
      body: await response.json(),
      screen: (await page.getByRole("status").textContent())?.trim() ?? null,
    });
  }

  // Status, corpo e tela idênticos: nada permite saber se a conta existe
  expect(outcomes[0]).toEqual(outcomes[1]);
  expect(outcomes[0]).toEqual({ status: 200, body: { message: RECOVERY_TEXT }, screen: RECOVERY_TEXT });
});
