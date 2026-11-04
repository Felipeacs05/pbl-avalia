import { expect, test } from "@playwright/test";

/**
 * Função utilitária para garantir presença de variáveis de ambiente do E2E
 */
function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

// Rota de registro suportando tanto o padrão /auth/register quanto /api/v1/auth/register
const REGISTER_ROUTE = /\/(api(\/v1)?)?\/auth\/register/;

let testUserName: string;
let testUserEmail: string;
let testUserPassword: string;

test.beforeAll(() => {
  // Variáveis exigidas para o cenário de teste E2E de criação de conta
  testUserName = requiredEnv("E2E_REGISTER_USER_NAME", "the full name of the user to register in US01");
  testUserEmail = requiredEnv("E2E_REGISTER_EMAIL", "the email of the user to register in US01");
  testUserPassword = requiredEnv("E2E_REGISTER_PASSWORD", "the password of the user to register in US01");
});

test.afterEach(async ({ page }) => {
  // Limpa o armazenamento do navegador entre execuções
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignora erro se a página já foi desmontada
    }
  });
});

test.describe("[US01] Cadastro de Usuário (Foto Opcional)", () => {
  test("Deve realizar o cadastro sem foto de perfil, exibir loading visual e redirecionar para a página de login", async ({
    page,
  }) => {
    // Intercepta a rota de backend para garantir determinismo e simular latência de rede para validação de loading
    await page.route(REGISTER_ROUTE, async (route) => {
      // Pequeno atraso para validar o estado visual 'Criando conta...'
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ message: "Conta criada com sucesso! Redirecionando..." }),
      });
    });

    // 1. Acessa a página de registro
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Criar Nova Conta" })).toBeVisible();

    // 2. Preenche os campos de cadastro sem anexar foto
    const nameInput = page.getByLabel("Nome Completo");
    const emailInput = page.getByLabel("E-mail");
    const passwordInput = page.getByLabel(/^senha$/i);
    const confirmPasswordInput = page.getByLabel("Confirme sua senha");

    await nameInput.fill(testUserName);
    await emailInput.fill(testUserEmail);
    await passwordInput.fill(testUserPassword);
    await confirmPasswordInput.fill(testUserPassword);

    // 3. Submete o formulário e observa a transição para loading
    const submitButton = page.getByRole("button", { name: "Cadastrar" });
    await submitButton.click();

    // 4. Valida estado de carregamento com botão 'Criando conta...' desabilitado
    const loadingButton = page.getByRole("button", { name: "Criando conta..." });
    await expect(loadingButton).toBeVisible();
    await expect(loadingButton).toBeDisabled();

    // 5. Valida a exibição do toast de sucesso filtrando pelo texto
    const successToast = page
      .locator("p")
      .filter({ hasText: /conta criada com sucesso! redirecionando\.\.\./i });
    await expect(successToast).toBeVisible();

    // 6. Valida o redirecionamento automático para a tela de login ("/") após o cadastro
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("[QA] Deve permitir cadastro com upload de foto de perfil válida (PNG) e exibir feedback visual de seleção", async ({
    page,
  }) => {
    await page.route(REGISTER_ROUTE, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ message: "Conta criada com sucesso! Redirecionando..." }),
      });
    });

    await page.goto("/register");

    // Preenche dados cadastrais
    await page.getByLabel("Nome Completo").fill("Usuário Com Foto");
    await page.getByLabel("E-mail").fill(`com.foto.${Date.now()}@uefs.br`);
    await page.getByLabel(/^senha$/i).fill("SenhaForte@2026");
    await page.getByLabel("Confirme sua senha").fill("SenhaForte@2026");

    // Anexa arquivo PNG pequeno em memória
    const fileInput = page.getByLabel(/foto de perfil/i);
    await fileInput.setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
    });

    // Valida o feedback visual de imagem selecionada com sucesso
    const imageFeedback = page
      .locator("p")
      .filter({ hasText: /imagem selecionada com sucesso/i });
    await expect(imageFeedback).toBeVisible();

    // Submete e aguarda redirecionamento para login
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });
});
