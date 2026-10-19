import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

const STUDENT_FEEDBACKS_ROUTE = /\/api\/v1\/students\/[^/?]+\/feedbacks(\?.*)?$/;
const FORBIDDEN_MESSAGE = /você só pode ver os seus próprios feedbacks/i;
// Contrato público do FeedbackDTO: nada de ids, e-mail ou senha
const PUBLIC_FIELDS = ["createdAt", "grade", "problemTitle", "text", "tutorName"];

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let problemId: string;
let studentId: string;
let otherStudentId: string;
let tutorName: string;
let baseURL: string;

// Textos únicos da execução: o spec não depende de feedbacks de execuções anteriores
const RUN = Date.now();
const STUDENT_TEXT = `Feedback E2E US17 do aluno A ${RUN}`;
const OTHER_STUDENT_TEXT = `Feedback E2E US17 do aluno B ${RUN}`;

function studentRoute(id: string) {
  return new RegExp(`/api/v1/students/${id}/feedbacks(\\?.*)?$`);
}

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function forbiddenAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: FORBIDDEN_MESSAGE });
}

// Painel aberto num contexto novo com a identidade do aluno: o config usa o tutor por padrão
async function withStudentPage(browser: Browser, id: string, check: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": id } });
  try {
    await check(await context.newPage());
  } finally {
    await context.close();
  }
}

async function sendFeedback(tutor: APIRequestContext, toStudentId: string, text: string) {
  const response = await tutor.post(`/api/v1/problems/${problemId}/feedbacks`, {
    data: { studentId: toStudentId, grade: 8.5, text },
  });
  expect(response.status(), `o feedback de preparo para ${toStudentId} não foi gravado`).toBe(201);
}

test.beforeAll(async ({ playwright }, testInfo) => {
  problemId = requiredEnv(
    "E2E_PROBLEM_ID",
    "the UUID of a problem whose room Tutor is E2E_USER_ID and whose room has E2E_STUDENT_ID and E2E_OTHER_STUDENT_ID as students",
  );
  studentId = requiredEnv("E2E_STUDENT_ID", "the UUID of the student A, enrolled in the room of E2E_PROBLEM_ID");
  otherStudentId = requiredEnv("E2E_OTHER_STUDENT_ID", "the UUID of the student B, enrolled in the same room");
  tutorName = requiredEnv("E2E_TUTOR_NAME", "the name of the user E2E_USER_ID, Tutor of the room of E2E_PROBLEM_ID");
  baseURL = String(testInfo.project.use.baseURL);

  // Preparo pela API da US16 (considerada resolvida): um feedback novo para cada aluno
  const tutor = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { "X-User-Id": requiredEnv("E2E_USER_ID", "the UUID of the Tutor") },
  });
  try {
    await sendFeedback(tutor, studentId, STUDENT_TEXT);
    await sendFeedback(tutor, otherStudentId, OTHER_STUDENT_TEXT);
  } finally {
    await tutor.dispose();
  }
});

test("[E2E][US17] Aluno lê no próprio painel o feedback recebido, com o nome do tutor, e não vê o do colega", async ({ browser }) => {
  await withStudentPage(browser, studentId, async (page) => {
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "GET" && STUDENT_FEEDBACKS_ROUTE.test(res.url())),
      page.goto(`/students/${studentId}/feedbacks`),
    ]);

    expect(response.url()).toMatch(studentRoute(studentId));
    expect(response.status()).toBe(200);
    const { content } = (await response.json()) as { content: Array<Record<string, unknown>> };
    // Mais recente primeiro: o feedback desta execução abre a lista
    expect(content[0]).toMatchObject({ tutorName, text: STUDENT_TEXT });
    content.forEach((item) => expect(Object.keys(item).sort()).toEqual(PUBLIC_FIELDS));

    const first = page.getByRole("listitem").first();
    await expect(first).toContainText(STUDENT_TEXT);
    // O nome do tutor emissor precisa estar visível (critério do "Quero")
    await expect(first).toContainText(tutorName);
    await expect(page.getByText(OTHER_STUDENT_TEXT)).toHaveCount(0);
    await expect(forbiddenAlert(page)).toHaveCount(0);
  });
});

test("[E2E][US17][QA] Aluno A abre pela URL o painel do aluno B, recebe a negativa e nenhum feedback de B aparece", async ({ browser }) => {
  await withStudentPage(browser, studentId, async (page) => {
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "GET" && STUDENT_FEEDBACKS_ROUTE.test(res.url())),
      page.goto(`/students/${otherStudentId}/feedbacks`),
    ]);

    expect(response.url()).toMatch(studentRoute(otherStudentId));
    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain(OTHER_STUDENT_TEXT);

    await expect(forbiddenAlert(page)).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(0);
    await expect(page.getByText(OTHER_STUDENT_TEXT)).toHaveCount(0);
  });
});

test("[E2E][US17][QA] Requisição direta à API com a identidade do aluno A pelos feedbacks do aluno B é negada sem vazar dados", async ({ playwright }) => {
  // Controle: o feedback de B existe e o próprio B o lê, então a negativa abaixo não é ausência de dados
  const owner = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": otherStudentId } });
  const ownerResponse = await owner.get(`/api/v1/students/${otherStudentId}/feedbacks`);
  const ownerBody = await ownerResponse.text();
  await owner.dispose();
  expect(ownerResponse.status()).toBe(200);
  expect(ownerBody).toContain(OTHER_STUDENT_TEXT);

  // Mesma rota, como no Postman/cURL, com a identidade do aluno A
  const intruder = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": studentId } });
  const response = await intruder.get(`/api/v1/students/${otherStudentId}/feedbacks`);
  const body = await response.text();
  await intruder.dispose();

  expect(response.status()).toBe(403);
  expect(body).not.toContain(OTHER_STUDENT_TEXT);
});
