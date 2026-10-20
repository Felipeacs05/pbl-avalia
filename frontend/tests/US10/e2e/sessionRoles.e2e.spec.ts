import { expect, test, type Page, type Request, type Route } from "@playwright/test";

type SessionRole = "COORDINATOR" | "BOARD_SECRETARY" | "TABLE_SECRETARY";

const ROLE_LABELS: Record<SessionRole, string> = {
  COORDINATOR: "Coordenador",
  BOARD_SECRETARY: "Secretário de Quadro",
  TABLE_SECRETARY: "Secretário de Mesa",
};

const ROLES_ROUTE = /\/api\/v1\/sessions\/[^/]+\/roles\/[A-Z_]+$/;
const ROLE_TAKEN_MESSAGE = /este papel já foi atribuído a outro aluno nesta sessão/i;
const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode atribuir papéis da sessão/i;

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let sessionId: string;
let studentName: string;
let otherStudentName: string;
let otherTutorId: string;

function studentRow(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

// A badge tem o mesmo texto da opção do select: as opções ficam fora da busca
function badge(page: Page, name: string, role: SessionRole) {
  return studentRow(page, name)
    .getByText(ROLE_LABELS[role], { exact: true })
    .and(page.locator(":not(option)"));
}

async function openRoles(page: Page) {
  await page.goto(`/sessions/${sessionId}/roles`);
  await expect(studentRow(page, studentName)).toBeVisible();
}

async function fillAndSubmit(page: Page, name: string, role: SessionRole, extraGrade: string) {
  const row = studentRow(page, name);
  await row.getByLabel(/papel/i).selectOption({ label: ROLE_LABELS[role] });
  await row.getByLabel(/nota extra/i).fill(extraGrade);
  await row.getByRole("button", { name: /atribuir/i }).click();
}

// Preenche, envia e espera o PUT real; a URL da API é derivada do tráfego do frontend
async function assignRole(page: Page, name: string, role: SessionRole, extraGrade: string) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PUT" && ROLES_ROUTE.test(res.url())),
    fillAndSubmit(page, name, role, extraGrade),
  ]);
  expect(response.url()).toMatch(new RegExp(`/api/v1/sessions/${sessionId}/roles/${role}$`));
  expect(response.request().postDataJSON()).toMatchObject({ extraGrade: Number(extraGrade) });
  return response;
}

test.beforeAll(() => {
  sessionId = requiredEnv(
    "E2E_SESSION_ID",
    "the UUID of a NEW tutoring session (no role assigned yet) whose room Tutor is E2E_USER_ID and that lists E2E_STUDENT_NAME and E2E_OTHER_STUDENT_NAME; the US10 has no route to remove a role, so use a fresh session on every run",
  );
  studentName = requiredEnv("E2E_STUDENT_NAME", "the name of an active student listed in E2E_SESSION_ID");
  otherStudentName = requiredEnv("E2E_OTHER_STUDENT_NAME", "the name of another active student listed in E2E_SESSION_ID");
  otherTutorId = requiredEnv("E2E_OTHER_TUTOR_ID", "the UUID of a user who is the Tutor of another room, not of E2E_SESSION_ID");
});

test.beforeEach(async ({ page }) => {
  await openRoles(page);
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("[E2E][US10][QA] Tutor atribui Secretário de Quadro a um aluno, recebe a recusa ao atribuí-lo a outro e o destaque fica só no primeiro", async ({ page }) => {
  // Pré-condição do ambiente: sem papel não removível de uma execução anterior
  for (const name of [studentName, otherStudentName]) {
    for (const role of Object.keys(ROLE_LABELS) as SessionRole[]) {
      await expect(badge(page, name, role), "E2E_SESSION_ID já tem papéis atribuídos: use uma sessão nova").toHaveCount(0);
    }
  }

  // 1) Secretário de Quadro para o 1º aluno, com a rede retida: o destaque aparece antes da resposta
  let heldRoute: Route | undefined;
  await page.route(ROLES_ROUTE, async (route) => {
    if (route.request().method() === "PUT" && !heldRoute) {
      heldRoute = route;
      return;
    }
    await route.continue();
  });

  await fillAndSubmit(page, studentName, "BOARD_SECRETARY", "0.5");

  await expect(badge(page, studentName, "BOARD_SECRETARY")).toBeVisible();
  // Destaque visual real: o navegador pinta um fundo na badge
  await expect(badge(page, studentName, "BOARD_SECRETARY")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(studentRow(page, studentName)).toHaveAttribute("aria-busy", "true");
  await expect.poll(() => heldRoute, { message: "o PUT da atribuição não saiu do frontend" }).toBeDefined();

  const [first] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PUT" && ROLES_ROUTE.test(res.url())),
    heldRoute!.continue(),
  ]);
  await page.unroute(ROLES_ROUTE);

  expect(first.url()).toMatch(new RegExp(`/api/v1/sessions/${sessionId}/roles/BOARD_SECRETARY$`));
  expect(first.request().postDataJSON()).toMatchObject({ extraGrade: 0.5 });
  expect(first.status()).toBe(201);
  const firstBody = (await first.json()) as { studentName: string; role: SessionRole };
  // O nome não vem no payload: a resposta foi montada a partir do banco
  expect(firstBody.studentName).toBe(studentName);
  await expect(studentRow(page, studentName)).not.toHaveAttribute("aria-busy", "true");

  await page.reload();
  await expect(badge(page, studentName, "BOARD_SECRETARY")).toBeVisible();

  // 2) O mesmo papel para o 2º aluno: o backend recusa, a mensagem aparece e o destaque é desfeito
  const refused = await assignRole(page, otherStudentName, "BOARD_SECRETARY", "0.5");
  expect(refused.status()).toBe(422);
  // O envio recusado leva o 2º aluno, não o que já tem o papel
  expect(refused.request().postDataJSON().studentId).not.toBe(first.request().postDataJSON().studentId);

  // O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
  await expect(page.getByRole("alert").filter({ hasText: ROLE_TAKEN_MESSAGE })).toBeVisible();
  await expect(badge(page, otherStudentName, "BOARD_SECRETARY")).toHaveCount(0);
  await expect(badge(page, studentName, "BOARD_SECRETARY")).toBeVisible();

  await page.reload();
  await expect(badge(page, otherStudentName, "BOARD_SECRETARY")).toHaveCount(0);
  await expect(badge(page, studentName, "BOARD_SECRETARY")).toBeVisible();

  // 3) Secretário de Mesa é outro papel: o 2º aluno o recebe
  const accepted = await assignRole(page, otherStudentName, "TABLE_SECRETARY", "0.5");
  expect(accepted.status()).toBe(201);
  expect(((await accepted.json()) as { studentName: string }).studentName).toBe(otherStudentName);
  await expect(page.getByRole("alert").filter({ hasText: ROLE_TAKEN_MESSAGE })).toHaveCount(0);
  await expect(badge(page, otherStudentName, "TABLE_SECRETARY")).toBeVisible();

  await page.reload();
  await expect(badge(page, studentName, "BOARD_SECRETARY")).toBeVisible();
  await expect(badge(page, otherStudentName, "TABLE_SECRETARY")).toBeVisible();
  await expect(badge(page, otherStudentName, "BOARD_SECRETARY")).toHaveCount(0);
});

test("[E2E][US10] Tutor de outra sala recebe 403 ao atribuir um papel e nenhum aluno passa a tê-lo", async ({ page, playwright }) => {
  // Captura a requisição que o frontend montaria, sem deixá-la gravar: URL e corpo vêm do tráfego real
  let captured: Request | undefined;
  await page.route(ROLES_ROUTE, async (route) => {
    captured = route.request();
    await route.abort();
  });
  await fillAndSubmit(page, studentName, "COORDINATOR", "1");
  await expect.poll(() => captured, { message: "o PUT da atribuição não saiu do frontend" }).toBeDefined();
  await page.unroute(ROLES_ROUTE);

  // A mesma requisição sai direto para a API com a identidade do tutor de outra sala
  const intruder = await playwright.request.newContext({ extraHTTPHeaders: { "X-User-Id": otherTutorId } });
  const response = await intruder.put(captured!.url(), { data: captured!.postDataJSON() });
  const body = await response.text();
  await intruder.dispose();

  expect(response.status()).toBe(403);
  // O 403 do backend é texto puro, não JSON
  expect(body).toMatch(FORBIDDEN_MESSAGE);

  await page.reload();
  await expect(badge(page, studentName, "COORDINATOR")).toHaveCount(0);
  await expect(badge(page, otherStudentName, "COORDINATOR")).toHaveCount(0);
});
