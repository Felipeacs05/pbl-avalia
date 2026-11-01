import { expect, test, type Browser, type Page, type Request } from "@playwright/test";

const GRADE_ADJUSTMENT_ROUTE = /\/api\/v1\/assessments\/[^/]+\/grade-adjustment$/;
const JUSTIFICATION_REQUIRED_MESSAGE = /justificativa é obrigatória/i;
const MODIFIED_BY_TUTOR_ICON = /nota modificada pelo tutor/i;

const ADJUSTED_GRADE = 8.5;
const JUSTIFICATION = "Nota subestimada frente ao desempenho";
// Nota que o aluno tenta se dar: nunca pode aparecer no painel
const INTRUDER_GRADE = 10;

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let assessmentId: string;
let studentId: string;
let studentName: string;
let originalGrade: number;

// Mesmo formato da interface: uma casa decimal com vírgula
function ptBrGrade(grade: number): string {
  return grade.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function modifiedIcon(page: Page) {
  return page.getByRole("img", { name: MODIFIED_BY_TUTOR_ICON });
}

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function justificationAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: JUSTIFICATION_REQUIRED_MESSAGE });
}

async function openTutorPage(page: Page) {
  await page.goto(`/assessments/${assessmentId}/grade-adjustment`);
  await expect(page.getByText(studentName)).toBeVisible();
}

async function fillAndSave(page: Page, grade: string, justification: string) {
  await page.getByLabel(/nota ajustada/i).fill(grade);
  await page.getByLabel(/justificativa/i).fill(justification);
  await page.getByRole("button", { name: /salvar ajuste/i }).click();
}

// Painel do aluno num contexto novo, com a identidade dele: o que aparece veio do banco, não do estado da tela do tutor
async function withStudentPanel(browser: Browser, check: (studentPage: Page) => Promise<void>) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    extraHTTPHeaders: { "X-User-Id": studentId },
  });
  try {
    const studentPage = await context.newPage();
    await studentPage.goto(`/assessments/${assessmentId}`);
    await check(studentPage);
  } finally {
    await context.close();
  }
}

test.beforeAll(() => {
  assessmentId = requiredEnv(
    "E2E_ASSESSMENT_ID",
    "the UUID of a NEW self-assessment (never adjusted) of a problem whose room Tutor is E2E_USER_ID; the US15 has no route to undo an adjustment, so use a fresh self-assessment on every run",
  );
  studentId = requiredEnv("E2E_STUDENT_ID", "the UUID of the student who submitted E2E_ASSESSMENT_ID");
  studentName = requiredEnv("E2E_STUDENT_NAME", "the name of the student who submitted E2E_ASSESSMENT_ID");
  originalGrade = Number(
    requiredEnv("E2E_ORIGINAL_GRADE", "the grade the student submitted in E2E_ASSESSMENT_ID, different from 8.5 and 10"),
  );
});

test.beforeEach(async ({ page }) => {
  await openTutorPage(page);
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("[E2E][US15][QA] Tutor tenta salvar o ajuste sem justificativa, a trava segura o envio no front e na API e, preenchida a justificativa, o aluno vê a nota nova com o ícone", async ({ page, browser }) => {
  // Pré-condição do ambiente: sem ajuste não removível de uma execução anterior
  await withStudentPanel(browser, async (studentPage) => {
    await expect(studentPage.getByText(/\d+,\d/).first()).toBeVisible();
    await expect(modifiedIcon(studentPage), "E2E_ASSESSMENT_ID já foi ajustada: use uma autoavaliação nova").toHaveCount(0);
    await expect(studentPage.getByText(ptBrGrade(originalGrade)), "E2E_ORIGINAL_GRADE não é a nota exibida ao aluno").toBeVisible();
  });

  const sentPatches: Request[] = [];
  page.on("request", (req) => {
    if (req.method() === "PATCH" && GRADE_ADJUSTMENT_ROUTE.test(req.url())) sentPatches.push(req);
  });

  // 1) Justificativa vazia: a trava do frontend segura o envio
  await fillAndSave(page, String(ADJUSTED_GRADE), "");
  await expect(justificationAlert(page)).toBeVisible();

  // 2) Só espaços: também bloqueado, como o @NotBlank do backend
  await fillAndSave(page, String(ADJUSTED_GRADE), "   ");
  await expect(justificationAlert(page)).toBeVisible();
  expect(sentPatches, "o PATCH saiu do frontend sem justificativa").toHaveLength(0);

  // Nada foi gravado
  await withStudentPanel(browser, async (studentPage) => {
    await expect(studentPage.getByText(ptBrGrade(originalGrade))).toBeVisible();
    await expect(modifiedIcon(studentPage)).toHaveCount(0);
  });

  // 3) Com a justificativa: o PATCH sai e o backend grava
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PATCH" && GRADE_ADJUSTMENT_ROUTE.test(res.url())),
    fillAndSave(page, String(ADJUSTED_GRADE), JUSTIFICATION),
  ]);

  expect(response.url()).toMatch(new RegExp(`/api/v1/assessments/${assessmentId}/grade-adjustment$`));
  expect(response.request().postDataJSON()).toEqual({ adjustedGrade: ADJUSTED_GRADE, justification: JUSTIFICATION });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { originalGrade: number; adjustedGrade: number; modifiedByTutor: boolean };
  // A nota original não vai no payload: a resposta foi montada a partir do banco
  expect(body).toMatchObject({ originalGrade, adjustedGrade: ADJUSTED_GRADE, modifiedByTutor: true });
  expect(sentPatches).toHaveLength(1);

  await expect(justificationAlert(page)).toHaveCount(0);
  await expect(modifiedIcon(page)).toBeVisible();
  await expect(page.getByText(ptBrGrade(ADJUSTED_GRADE))).toBeVisible();

  // 4) Painel do aluno: a nota nova acompanhada do ícone, no lugar da nota que ele enviou
  await withStudentPanel(browser, async (studentPage) => {
    await expect(modifiedIcon(studentPage)).toBeVisible();
    await expect(studentPage.getByText(ptBrGrade(ADJUSTED_GRADE))).toBeVisible();
    await expect(studentPage.getByText(ptBrGrade(originalGrade))).toHaveCount(0);
  });

  // 5) A trava também existe na API: o mesmo PATCH sem justificativa, enviado direto, é recusado com 400
  const blank = await page.request.patch(response.url(), { data: { adjustedGrade: 3, justification: "   " } });
  expect(blank.status()).toBe(400);
  expect(((await blank.json()) as { errors: Record<string, string> }).errors.justification).toMatch(
    JUSTIFICATION_REQUIRED_MESSAGE,
  );

  await withStudentPanel(browser, async (studentPage) => {
    await expect(studentPage.getByText(ptBrGrade(ADJUSTED_GRADE))).toBeVisible();
    await expect(studentPage.getByText(ptBrGrade(3))).toHaveCount(0);
  });
});

test("[E2E][US15] Aluno recebe 403 ao tentar alterar a própria nota e o painel dele não mostra a nota que ele enviou", async ({ page, browser, playwright }) => {
  // Captura a requisição que o frontend montaria, sem deixá-la gravar: URL e corpo vêm do tráfego real
  let captured: Request | undefined;
  await page.route(GRADE_ADJUSTMENT_ROUTE, async (route) => {
    captured = route.request();
    await route.abort();
  });
  await fillAndSave(page, String(INTRUDER_GRADE), "Quero nota máxima");
  await expect.poll(() => captured, { message: "o PATCH do ajuste não saiu do frontend" }).toBeDefined();
  await page.unroute(GRADE_ADJUSTMENT_ROUTE);
  expect(captured!.postDataJSON()).toEqual({ adjustedGrade: INTRUDER_GRADE, justification: "Quero nota máxima" });

  // A mesma requisição sai direto para a API com a identidade do aluno autor da autoavaliação
  const student = await playwright.request.newContext({ extraHTTPHeaders: { "X-User-Id": studentId } });
  const response = await student.patch(captured!.url(), { data: captured!.postDataJSON() });
  await student.dispose();

  expect(response.status()).toBe(403);

  await withStudentPanel(browser, async (studentPage) => {
    // Espera a nota carregar: sem isto, a ausência abaixo passaria com a página ainda vazia
    await expect(studentPage.getByText(/\d+,\d/).first()).toBeVisible();
    await expect(studentPage.getByText(ptBrGrade(INTRUDER_GRADE))).toHaveCount(0);
  });
});
