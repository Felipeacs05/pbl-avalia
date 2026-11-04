import { expect, test } from "@playwright/test";

// Rota de login aceitando /auth/login e /api/v1/auth/login
const LOGIN_ROUTE = /\/(api(\/v1)?)?\/auth\/login/;

const MOCK_JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDEiLCJuYW1lIjoiTWFybHVzIFJpb3MiLCJpYXQiOjE1MTYyMzkwMjJ9.dummySig";

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignora erro se a página já foi desmontada
    }
  });
});

test.describe("[US02] Autenticação e Dashboard de Salas", () => {
  test("Deve realizar o login com sucesso, persistir o token JWT e redirecionar para '/teacher-rooms'", async ({
    page,
  }) => {
    // Intercepta a rota de login simulando resposta 200 com delay para validar loading
    await page.route(LOGIN_ROUTE, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: MOCK_JWT_TOKEN,
          user: { id: "usr_01", name: "Marlus Rios", email: "marlus@uefs.br" },
        }),
      });
    });

    // 1. Acessa a tela inicial de login
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Acessar Conta" })).toBeVisible();

    // 2. Preenche os campos obrigatórios
    await page.getByLabel("E-mail").fill("marlus@uefs.br");
    await page.getByLabel("Senha").fill("123456");

    // 3. Submete o formulário e valida estado de loading
    const submitButton = page.getByRole("button", { name: "Entrar" });
    await submitButton.click();

    // 4. Observa transição para "Entrando..." desabilitado
    const loadingButton = page.getByRole("button", { name: /entrando\.\.\./i });
    await expect(loadingButton).toBeVisible();
    await expect(loadingButton).toBeDisabled();

    // 5. Redirecionamento para o dashboard de professor
    await expect(page).toHaveURL("/teacher-rooms", { timeout: 10_000 });

    // 6. Garante que o token foi gravado no localStorage
    const savedToken = await page.evaluate(() => localStorage.getItem("token"));
    expect(savedToken).toBe(MOCK_JWT_TOKEN);
  });

  test("[QA] Deve exibir alerta de erro com credenciais inválidas e não redirecionar nem salvar token", async ({
    page,
  }) => {
    await page.route(LOGIN_ROUTE, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Credenciais inválidas." }),
      });
    });

    await page.goto("/");

    await page.getByLabel("E-mail").fill("usuario.errado@uefs.br");
    await page.getByLabel("Senha").fill("senhaIncorreta");
    await page.getByRole("button", { name: "Entrar" }).click();

    // O banner de erro deve ser visível na página
    const errorBanner = page.getByRole("alert");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toHaveText("Credenciais inválidas.");

    // Permanece na tela inicial
    expect(page.url()).not.toContain("/teacher-rooms");

    // Token deve permanecer ausente
    const savedToken = await page.evaluate(() => localStorage.getItem("token"));
    expect(savedToken).toBeNull();
  });
});
