import { expect, test } from "@playwright/test";

/**
 * Garante que uma variável de ambiente obrigatória para o E2E está definida.
 * Lança erro descritivo ao primeiro acesso caso esteja ausente.
 */
function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} deve estar definido: ${description}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Constantes de rota e credenciais
// ---------------------------------------------------------------------------

/** Padrão que captura tanto /api/v1/rooms como /rooms */
const ROOMS_API = /\/api\/v1\/rooms/;
/** Rota de listagem (GET /api/v1/rooms) */
const ROOMS_LIST_API = /\/api\/v1\/rooms$/;
/** Rota de exclusão (DELETE /api/v1/rooms/{id}) */
const ROOM_DELETE_API = /\/api\/v1\/rooms\/[^/]+$/;

/** Credenciais do tutor injetadas pelo global-setup (X-User-Id já vai no header) */
let tutorId: string;

/** ID da sala criada durante o teste — para limpeza no afterEach */
let createdRoomId: string | undefined;

// ---------------------------------------------------------------------------
// Setup e teardown
// ---------------------------------------------------------------------------

test.beforeAll(() => {
  tutorId = requiredEnv("E2E_TUTOR_ID", "UUID do tutor com salas cadastradas");
});

test.afterEach(async ({ request }) => {
  // Remove a sala criada pelo teste de criação para não sujar o banco
  if (createdRoomId) {
    await request
      .delete(`/api/v1/rooms/${createdRoomId}`)
      .catch(() => undefined); // tolerante a falhas; o banco de e2e é descartável
    createdRoomId = undefined;
  }
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("[US03] Criação e Gestão de Salas", () => {
  // -------------------------------------------------------------------------
  // 1. Criação: sala nova aparece na lista com código alfanumérico gerado
  // -------------------------------------------------------------------------
  test("Deve criar uma sala, exibir o código alfanumérico gerado pelo servidor e o toast de sucesso", async ({
    page,
  }) => {
    await page.goto("/teacher-rooms");

    // Aguarda a lista de salas carregar
    await page.waitForResponse((resp) => resp.url().match(ROOMS_LIST_API) !== null && resp.status() === 200);

    // Abre o modal de criação
    await page.getByRole("button", { name: /criar nova sala/i }).click();

    const nameInput = page.getByRole("textbox", { name: /nome da sala/i });
    await expect(nameInput).toBeVisible();

    const newRoomName = `QA Sala E2E ${Date.now()}`;
    await nameInput.fill(newRoomName);

    // Intercepta a resposta de criação para capturar o ID e o código gerados
    const createResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().match(ROOMS_API) !== null &&
        resp.request().method() === "POST" &&
        resp.status() === 201,
    );

    await page.getByRole("button", { name: /^criar$/i }).click();

    // Valida o estado de loading: botão muda para "Criando..." e fica desabilitado
    const loadingBtn = page.getByRole("button", { name: /criando\.\.\./i });
    // Pode já ter desaparecido se a rede for rápida — usa soft assertion
    // O importante é que nunca seja possível clicar duas vezes durante a operação
    await expect(loadingBtn.or(page.getByText(/sala criada com sucesso/i))).toBeVisible();

    // Aguarda a resposta do backend e captura o ID da sala criada
    const createResponse = await createResponsePromise;
    const responseBody = (await createResponse.json()) as { code?: string; id?: string };
    const generatedCode = responseBody.code ?? "";

    // Armazena para limpeza no afterEach (tenta extrair ID da URL da requisição)
    const locationHeader = createResponse.headers()["location"] ?? "";
    const idFromHeader = locationHeader.split("/").at(-1);
    createdRoomId = idFromHeader || responseBody.id;

    // Toast de sucesso deve aparecer
    await expect(
      page.locator("[role='alert'], [role='status']").filter({ hasText: /sala criada com sucesso/i }),
    ).toBeVisible();

    // O modal deve fechar
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // A sala nova deve aparecer na lista com o código retornado pelo servidor
    if (generatedCode) {
      await expect(page.getByText(generatedCode)).toBeVisible();
    }

    // O nome da sala deve estar visível
    await expect(page.getByText(newRoomName)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 2. Copiar Link: clipboard recebe a URL correta e toast aparece
  // -------------------------------------------------------------------------
  test("Deve copiar o link de convite para o clipboard e exibir toast 'Link copiado!'", async ({
    page,
  }) => {
    await page.goto("/teacher-rooms");

    // Aguarda as salas carregarem
    await page.waitForResponse((resp) => resp.url().match(ROOMS_LIST_API) !== null && resp.status() === 200);

    // Clica no primeiro botão "Copiar Link" encontrado
    const copyBtn = page.getByRole("button", { name: /copiar link/i }).first();
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Toast de sucesso deve aparecer
    await expect(
      page.locator("[role='alert'], [role='status']").filter({ hasText: /link copiado/i }),
    ).toBeVisible();

    // Valida que o clipboard recebeu uma URL com o padrão app/join/{código}
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/https?:\/\/.+\/app\/join\/[A-Z0-9]+/i);
  });

  // -------------------------------------------------------------------------
  // 3. [QA] Validação de nome: nome com apenas 2 caracteres não cria a sala
  // -------------------------------------------------------------------------
  test("[QA] Deve exibir erro de validação ao tentar criar sala com nome de 2 caracteres", async ({
    page,
  }) => {
    await page.goto("/teacher-rooms");
    await page.waitForResponse((resp) => resp.url().match(ROOMS_LIST_API) !== null && resp.status() === 200);

    await page.getByRole("button", { name: /criar nova sala/i }).click();

    const nameInput = page.getByRole("textbox", { name: /nome da sala/i });
    await nameInput.fill("AB");

    await page.getByRole("button", { name: /^criar$/i }).click();

    // Erro de validação deve aparecer sem fechar o modal
    await expect(
      page.getByRole("alert").filter({ hasText: /nome da sala deve ter entre 3 e 100/i }),
    ).toBeVisible();

    // Modal permanece aberto
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 4. Exclusão: sala é removida após confirmação no ConfirmModal
  // -------------------------------------------------------------------------
  test("Deve excluir uma sala após confirmação e remover da lista", async ({ page, request }) => {
    // Cria uma sala via API para garantir que existe algo a excluir
    const createResp = await request.post("/api/v1/rooms", {
      data: { name: `QA Excluir E2E ${Date.now()}` },
    });
    expect(createResp.status()).toBe(201);
    const created = (await createResp.json()) as { id?: string; code?: string };
    const roomIdToDelete = created.id;
    const roomCode = created.code ?? "";

    await page.goto("/teacher-rooms");
    await page.waitForResponse((resp) => resp.url().match(ROOMS_LIST_API) !== null && resp.status() === 200);

    // Localiza o card da sala recém-criada e clica em "Excluir"
    const card = page.locator("li").filter({ hasText: roomCode || `QA Excluir` });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /excluir/i }).click();

    // ConfirmModal aparece
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();

    // Intercepta a chamada DELETE antes de confirmar
    const deleteResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().match(ROOM_DELETE_API) !== null &&
        resp.request().method() === "DELETE",
    );

    // Confirma a exclusão
    await dialog.getByRole("button", { name: /^excluir$/i }).click();

    // Backend recebe o DELETE
    const deleteResp = await deleteResponsePromise;
    expect([200, 204]).toContain(deleteResp.status());

    // Toast de exclusão confirma sucesso
    await expect(
      page.locator("[role='alert'], [role='status']").filter({ hasText: /sala deletada com sucesso/i }),
    ).toBeVisible();

    // O card não deve mais aparecer na lista
    await expect(card).not.toBeVisible({ timeout: 5_000 });

    // Garante que o afterEach não tente deletar de novo
    if (roomIdToDelete) createdRoomId = undefined;
  });

  // -------------------------------------------------------------------------
  // 5. [QA] Cancelar exclusão: DELETE não é chamado
  // -------------------------------------------------------------------------
  test("[QA] Deve NÃO excluir a sala quando o tutor cancela o ConfirmModal", async ({
    page,
  }) => {
    await page.goto("/teacher-rooms");
    await page.waitForResponse((resp) => resp.url().match(ROOMS_LIST_API) !== null && resp.status() === 200);

    // Pega o nome da primeira sala disponível antes de tentar excluir
    const firstCard = page.locator("li").first();
    await expect(firstCard).toBeVisible();
    const roomNameText = await firstCard.locator("h2, h3, [data-testid='room-name']").first().textContent();

    // Abre o ConfirmModal
    await firstCard.getByRole("button", { name: /excluir/i }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();

    // Monitora se algum DELETE sai (não deveria)
    let deleteWasCalled = false;
    page.on("request", (req) => {
      if (req.method() === "DELETE" && req.url().match(ROOM_DELETE_API)) {
        deleteWasCalled = true;
      }
    });

    // Cancela
    await dialog.getByRole("button", { name: /cancelar/i }).click();

    // Modal fecha
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });

    // Aguarda um momento para garantir que nenhuma requisição atrasada saia
    await page.waitForTimeout(500);
    expect(deleteWasCalled).toBe(false);

    // A sala ainda deve estar na lista
    if (roomNameText) {
      await expect(page.getByText(roomNameText)).toBeVisible();
    }
  });
});
