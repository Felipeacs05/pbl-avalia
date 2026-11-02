import { expect, test, type Page, type Request } from "@playwright/test";

type BehaviorTag = { id: string; name: string };
type BehaviorRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  tagId: string | null;
  tagName: string | null;
  text: string | null;
  recordedAt: string;
};

const TAGS_ROUTE = /\/api\/v1\/behavior-tags$/;
const RECORDS_ROUTE = /\/api\/v1\/sessions\/[^/]+\/students\/[^/]+\/behavior-records$/;
const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode registrar comportamentos/i;
const TEXT_TOO_LONG_TEXT = "O texto deve ter no máximo 500 caracteres.";
const TEXT_TOO_LONG_MESSAGE = /o texto deve ter no máximo 500 caracteres/i;

const TEXT_LIMIT = 500;
// O último caractere é distinto: um corte silencioso em qualquer camada seria detectado
const TEXT_AT_LIMIT = "x".repeat(TEXT_LIMIT - 1) + "!";
const TEXT_OVER_LIMIT = "x".repeat(TEXT_LIMIT + 1);

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

// Nomes vêm do backend e do ambiente: caracteres como "(" ou "?" não podem virar sintaxe de regex
function literal(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let sessionId: string;
let studentName: string;
let otherTutorId: string;

function studentButton(page: Page, name: string) {
  return page.getByRole("list").getByRole("button", { name, exact: true });
}

function panelOf(page: Page, name: string) {
  return page.getByRole("dialog", { name: new RegExp(literal(name), "i") });
}

// O filtro evita colidir com o contador do painel, que também usa role="status"
function confirmation(page: Page, text: RegExp) {
  return page.getByRole("status").filter({ hasText: text });
}

// Abre a tela e devolve as tags que o frontend recebeu do backend real
async function openBehaviorRecords(page: Page): Promise<BehaviorTag[]> {
  const [tagsResponse] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "GET" && TAGS_ROUTE.test(res.url())),
    page.goto(`/sessions/${sessionId}/behavior-records`),
  ]);
  expect(tagsResponse.status()).toBe(200);
  const tags = (await tagsResponse.json()) as BehaviorTag[];
  expect(tags.length, "nenhuma tag predefinida semeada no backend").toBeGreaterThan(0);
  await expect(studentButton(page, studentName)).toBeVisible();
  return tags;
}

// Executa a ação e espera o POST real do registro; a URL da API é derivada do tráfego do frontend
async function postFrom(page: Page, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && RECORDS_ROUTE.test(res.url())),
    action(),
  ]);
  return response;
}

test.beforeAll(() => {
  sessionId = requiredEnv(
    "E2E_SESSION_ID",
    "the UUID of a tutoring session whose room Tutor is E2E_USER_ID and that lists E2E_STUDENT_NAME",
  );
  studentName = requiredEnv("E2E_STUDENT_NAME", "the name of an active student listed in E2E_SESSION_ID");
  otherTutorId = requiredEnv("E2E_OTHER_TUTOR_ID", "the UUID of a user who is the Tutor of another room, not of E2E_SESSION_ID");
});

// Sem limpeza: a US11 não tem DELETE de registros, e cada execução acrescenta ocorrências ao perfil do aluno

test("[E2E][US11] Tutor registra uma tag em 2 toques, repete a tag e adiciona um texto livre; cada envio vira um registro novo", async ({ page }) => {
  const tags = await openBehaviorRecords(page);
  const tag = tags[0];

  // 1) Toque no aluno, toque na tag: o POST sai sem nenhuma etapa intermediária
  await studentButton(page, studentName).click();
  const panel = panelOf(page, studentName);
  await expect(panel).toBeVisible();
  // O painel mostra as tags que vieram do backend, na ordem recebida
  await expect(panel.getByRole("button").filter({ hasNotText: /salvar observação/i })).toHaveText(
    tags.map((listed) => listed.name),
  );

  const first = await postFrom(page, () => panel.getByRole("button", { name: tag.name, exact: true }).click());

  // O corpo leva só o id da tag tocada; nomes e horário são do servidor
  expect(first.request().postDataJSON()).toEqual({ tagId: tag.id });
  expect(first.status()).toBe(201);
  const firstRecord = (await first.json()) as BehaviorRecord;
  expect(firstRecord).toMatchObject({ sessionId, studentName, tagId: tag.id, tagName: tag.name, text: null });
  expect(Number.isNaN(Date.parse(firstRecord.recordedAt))).toBe(false);

  await expect(panel).toBeHidden();
  await expect(confirmation(page, new RegExp(`${literal(tag.name)} registrado para ${literal(studentName)}`, "i"))).toBeVisible();

  // 2) A mesma tag de novo: nova ocorrência, e não substituição
  await studentButton(page, studentName).click();
  const second = await postFrom(page, () =>
    panelOf(page, studentName).getByRole("button", { name: tag.name, exact: true }).click(),
  );
  expect(second.status()).toBe(201);
  const secondRecord = (await second.json()) as BehaviorRecord;
  expect(secondRecord.id).not.toBe(firstRecord.id);
  expect(second.url()).toBe(first.url());

  // 3) Texto livre no perfil do mesmo aluno
  const text = `Observação E2E ${Date.now()}: trouxe uma referência que reorientou a discussão.`;
  await studentButton(page, studentName).click();
  const textPanel = panelOf(page, studentName);
  await textPanel.getByLabel(/observação/i).fill(text);
  const textResponse = await postFrom(page, () =>
    textPanel.getByRole("button", { name: /salvar observação/i }).click(),
  );

  expect(textResponse.request().postDataJSON()).toEqual({ text });
  expect(textResponse.status()).toBe(201);
  expect((await textResponse.json()) as BehaviorRecord).toMatchObject({ studentName, tagId: null, text });
  await expect(textPanel).toBeHidden();
  await expect(confirmation(page, new RegExp(`observação registrada para ${literal(studentName)}`, "i"))).toBeVisible();
});

test("[E2E][US11][QA] Texto livre de 501 caracteres é bloqueado no front sem requisição e na API com 400; com 500 é aceito e devolvido inteiro", async ({ page }) => {
  await openBehaviorRecords(page);
  const posts: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && RECORDS_ROUTE.test(req.url())) posts.push(req);
  });

  await studentButton(page, studentName).click();
  const panel = panelOf(page, studentName);
  const textInput = panel.getByLabel(/observação/i);
  const saveButton = panel.getByRole("button", { name: /salvar observação/i });

  // 1) Front: o excesso é aceito no campo, mas o envio fica bloqueado
  await textInput.fill(TEXT_OVER_LIMIT);
  await expect(panel.getByRole("alert")).toHaveText(TEXT_TOO_LONG_MESSAGE);
  await expect(panel.getByRole("status")).toHaveText("501/500");
  await expect(saveButton).toBeDisabled();
  // force: tenta o toque mesmo desabilitado, como um tutor insistindo no botão
  await saveButton.click({ force: true });
  await expect(panel).toBeVisible();
  await expect(textInput).toHaveValue(TEXT_OVER_LIMIT);

  // 2) Reduzido ao limite: o envio sai e o texto volta inteiro do servidor
  await textInput.fill(TEXT_AT_LIMIT);
  await expect(panel.getByRole("alert")).toHaveCount(0);
  const accepted = await postFrom(page, () => saveButton.click());

  expect(accepted.status()).toBe(201);
  expect(accepted.request().postDataJSON()).toEqual({ text: TEXT_AT_LIMIT });
  expect(((await accepted.json()) as BehaviorRecord).text).toBe(TEXT_AT_LIMIT);
  // Um POST de 501 teria sido disparado antes deste: só o envio válido saiu do frontend
  expect(posts.map((req) => req.postDataJSON())).toEqual([{ text: TEXT_AT_LIMIT }]);

  // 3) API: a mesma rota, chamada direto com 501 caracteres, é bloqueada pelo backend
  const direct = await page.request.post(accepted.url(), { data: { text: TEXT_OVER_LIMIT } });
  expect(direct.status()).toBe(400);
  const error = (await direct.json()) as { message: string; errors: Record<string, string> };
  expect(error.message).toBe("Validation failed");
  expect(error.errors.text).toBe(TEXT_TOO_LONG_TEXT);
});

test("[E2E][US11] Alunos, tags e envio têm área de toque de no mínimo 44x44 pixels no celular", async ({ page }) => {
  // Aqui o layout é real, ao contrário do jsdom: mede a caixa renderizada no tamanho de um celular
  await page.setViewportSize({ width: 375, height: 667 });
  const tags = await openBehaviorRecords(page);

  const studentBox = await studentButton(page, studentName).boundingBox();
  expect(studentBox, `botão do aluno ${studentName} sem caixa renderizada`).not.toBeNull();
  expect(studentBox!.width).toBeGreaterThanOrEqual(44);
  expect(studentBox!.height).toBeGreaterThanOrEqual(44);

  await studentButton(page, studentName).click();
  const panel = panelOf(page, studentName);
  const buttons = [
    ...tags.map((tag) => ({ label: tag.name, locator: panel.getByRole("button", { name: tag.name, exact: true }) })),
    { label: "Salvar observação", locator: panel.getByRole("button", { name: /salvar observação/i }) },
  ];
  for (const { label, locator } of buttons) {
    const box = await locator.boundingBox();
    expect(box, `botão ${label} sem caixa renderizada`).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("[E2E][US11] Tutor de outra sala recebe 403 ao registrar comportamento no aluno desta sessão", async ({ page, playwright }) => {
  const tags = await openBehaviorRecords(page);

  // Um registro legítimo revela a URL real da API para este aluno
  await studentButton(page, studentName).click();
  const legit = await postFrom(page, () =>
    panelOf(page, studentName).getByRole("button", { name: tags[0].name, exact: true }).click(),
  );
  expect(legit.status()).toBe(201);

  // A requisição sai direto para a API com a identidade do tutor de outra sala
  const intruder = await playwright.request.newContext({ extraHTTPHeaders: { "X-User-Id": otherTutorId } });
  const response = await intruder.post(legit.url(), { data: { tagId: tags[0].id } });
  const body = await response.text();
  await intruder.dispose();

  expect(response.status()).toBe(403);
  // O 403 do backend é texto puro, não JSON
  expect(body).toMatch(FORBIDDEN_MESSAGE);
});
