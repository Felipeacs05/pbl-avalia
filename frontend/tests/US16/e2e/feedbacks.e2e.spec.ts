import { expect, test, type Page, type Request, type Route } from "@playwright/test";

const FEEDBACKS_ROUTE = /\/api\/v1\/problems\/[^/]+\/feedbacks$/;
const BATCH_ROUTE = /\/api\/v1\/problems\/[^/]+\/feedbacks\/batch$/;
const TIMEOUT_MESSAGE = /o envio demorou demais e não foi concluído/i;

// Mesmos limites do FeedbackIntegrationTest do backend
const CLASS_SIZE = 40;
const BATCH_TIME_LIMIT_MS = 2_000;

const GRADE = 8.5;
const TEXT = "Excelente participação nas sessões";

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let problemId: string;
let studentName: string;
let studentId: string;

async function openFeedbacks(page: Page) {
  await page.goto(`/problems/${problemId}/feedbacks`);
  await expect(page.getByLabel(/aluno/i)).toBeVisible();
}

// Os alunos que a tela oferece: o lote precisa levar exatamente estes
async function listedStudentIds(page: Page): Promise<string[]> {
  const values = await page.getByLabel(/aluno/i).locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  return values.filter(Boolean);
}

async function writeFeedback(page: Page, grade: string, text: string) {
  await page.getByLabel(/nota/i).fill(grade);
  await page.getByLabel(/feedback/i).fill(text);
}

function sendToStudentButton(page: Page) {
  return page.getByRole("button", { name: /enviar para o aluno/i });
}

function sendToClassButton(page: Page) {
  return page.getByRole("button", { name: /enviar para a turma/i });
}

test.beforeAll(() => {
  problemId = requiredEnv(
    "E2E_PROBLEM_ID",
    `the UUID of a problem whose room Tutor is E2E_USER_ID and whose room has at least ${CLASS_SIZE} active students`,
  );
  studentName = requiredEnv("E2E_STUDENT_NAME", "the name of an active student of the room of E2E_PROBLEM_ID");
  studentId = requiredEnv("E2E_STUDENT_ID", "the UUID of the student named E2E_STUDENT_NAME");
});

test.beforeEach(async ({ page }) => {
  await openFeedbacks(page);
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("[E2E][US16] Tutor redige um feedback e o envia a um único aluno; a confirmação vem do que o servidor gravou", async ({ page }) => {
  const sentBatches: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && BATCH_ROUTE.test(req.url())) sentBatches.push(req);
  });

  await page.getByLabel(/aluno/i).selectOption({ label: studentName });
  await writeFeedback(page, String(GRADE), TEXT);

  // Envia e espera o POST real; a URL da API é derivada do tráfego do frontend
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && FEEDBACKS_ROUTE.test(res.url())),
    sendToStudentButton(page).click(),
  ]);

  expect(response.url()).toMatch(new RegExp(`/api/v1/problems/${problemId}/feedbacks$`));
  expect(response.request().postDataJSON()).toEqual({ studentId, grade: GRADE, text: TEXT });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id: string; problemId: string; studentId: string };
  // O id não vai no payload: a resposta foi montada a partir do banco
  expect(body.id).toEqual(expect.any(String));
  expect(body).toMatchObject({ problemId, studentId, grade: GRADE, text: TEXT });

  await expect(page.getByRole("status")).toHaveText(/feedback enviado para 1 aluno\b/i);
  expect(sentBatches).toHaveLength(0);
});

test("[E2E][US16][QA] Lote para a sala cheia sai em uma única requisição e responde 201 em menos de 2 segundos, sem 504", async ({ page }) => {
  const studentIds = await listedStudentIds(page);
  // Pré-condição do ambiente: a subtarefa pede uma sala cheia
  expect(studentIds.length, `E2E_PROBLEM_ID precisa de uma sala com ao menos ${CLASS_SIZE} alunos`).toBeGreaterThanOrEqual(CLASS_SIZE);

  const sentPosts: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && (FEEDBACKS_ROUTE.test(req.url()) || BATCH_ROUTE.test(req.url()))) sentPosts.push(req);
  });

  await writeFeedback(page, "8", TEXT);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && BATCH_ROUTE.test(res.url())),
    sendToClassButton(page).click(),
  ]);
  await response.finished();

  // Tempo medido pelo navegador do envio até o fim da resposta
  const elapsed = response.request().timing().responseEnd;
  expect(response.status(), "o lote estourou o tempo da API").not.toBe(504);
  expect(response.status()).toBe(201);
  expect(elapsed, `o lote levou ${Math.round(elapsed)} ms`).toBeLessThan(BATCH_TIME_LIMIT_MS);

  // Critério de Desempenho: um disparo para a turma inteira, nenhum envio individual
  expect(response.url()).toMatch(new RegExp(`/api/v1/problems/${problemId}/feedbacks/batch$`));
  expect(response.request().postDataJSON()).toEqual({
    feedbacks: studentIds.map((id) => ({ studentId: id, grade: 8, text: TEXT })),
  });
  expect(sentPosts).toHaveLength(1);

  // Um feedback gravado por aluno, cada um com o id dado pelo banco
  const saved = (await response.json()) as Array<{ id: string; studentId: string }>;
  expect(saved.map((feedback) => feedback.studentId).sort()).toEqual([...studentIds].sort());
  expect(new Set(saved.map((feedback) => feedback.id)).size).toBe(studentIds.length);

  await expect(page.getByRole("status")).toHaveText(new RegExp(`feedback enviado para ${studentIds.length} alunos`, "i"));
  // O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
  await expect(page.getByRole("alert").filter({ hasText: TIMEOUT_MESSAGE })).toHaveCount(0);
  await expect(sendToClassButton(page)).toBeEnabled();
});

test("[E2E][US16][QA] Com o lote retido e respondido com 504, os envios ficam bloqueados, o tempo esgotado é avisado e o reenvio grava a turma", async ({ page }) => {
  const studentIds = await listedStudentIds(page);

  // 1) Lote retido: o 504 do gateway é simulado só nesta primeira tentativa
  let heldRoute: Route | undefined;
  await page.route(BATCH_ROUTE, async (route) => {
    if (!heldRoute) {
      heldRoute = route;
      return;
    }
    await route.continue();
  });

  await writeFeedback(page, "8", TEXT);
  await sendToClassButton(page).click();
  await expect.poll(() => heldRoute, { message: "o POST do lote não saiu do frontend" }).toBeDefined();

  // Enquanto o lote não termina, um segundo disparo dobraria a carga
  await expect(sendToClassButton(page)).toBeDisabled();
  await expect(sendToStudentButton(page)).toBeDisabled();

  await heldRoute!.fulfill({
    status: 504,
    contentType: "text/html",
    body: "<html><body>504 Gateway Time-out</body></html>",
  });
  await page.unroute(BATCH_ROUTE);

  await expect(page.getByRole("alert").filter({ hasText: TIMEOUT_MESSAGE })).toBeVisible();
  // O tutor não fica preso: o envio volta a ficar disponível
  await expect(sendToClassButton(page)).toBeEnabled();

  // 2) Reenvio, agora até o backend real: a turma inteira é gravada e o aviso some
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && BATCH_ROUTE.test(res.url())),
    sendToClassButton(page).click(),
  ]);

  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({
    feedbacks: studentIds.map((id) => ({ studentId: id, grade: 8, text: TEXT })),
  });
  expect(((await response.json()) as unknown[]).length).toBe(studentIds.length);
  await expect(page.getByRole("alert").filter({ hasText: TIMEOUT_MESSAGE })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText(new RegExp(`feedback enviado para ${studentIds.length} alunos`, "i"));
});

test("[E2E][US16] Aluno recebe 403 ao tentar disparar um feedback", async ({ page, playwright }) => {
  // Captura a requisição que o frontend montaria, sem deixá-la gravar: URL e corpo vêm do tráfego real
  let captured: Request | undefined;
  await page.route(FEEDBACKS_ROUTE, async (route) => {
    captured = route.request();
    await route.abort();
  });
  await page.getByLabel(/aluno/i).selectOption({ label: studentName });
  await writeFeedback(page, "10", "Quero enviar");
  await sendToStudentButton(page).click();
  await expect.poll(() => captured, { message: "o POST do feedback não saiu do frontend" }).toBeDefined();
  await page.unroute(FEEDBACKS_ROUTE);
  expect(captured!.postDataJSON()).toEqual({ studentId, grade: 10, text: "Quero enviar" });

  // A mesma requisição sai direto para a API com a identidade do aluno
  const student = await playwright.request.newContext({ extraHTTPHeaders: { "X-User-Id": studentId } });
  const response = await student.post(captured!.url(), { data: captured!.postDataJSON() });
  await student.dispose();

  expect(response.status()).toBe(403);
});
