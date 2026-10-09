import { expect, test, type Page, type Route } from "@playwright/test";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "JUSTIFIED_ABSENCE";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Falta",
  LATE: "Atraso",
  JUSTIFIED_ABSENCE: "Falta Justificada",
};

const ATTENDANCE_ROUTE = /\/api\/v1\/sessions\/[^/]+\/attendances\/[^/?#]+$/;
const TIMEOUT_MESSAGE = /tempo esgotado ao salvar a presença/i;
const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode registrar a chamada/i;

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
let originalStatus: AttendanceStatus | null;
let attendanceUrl: string | undefined;

function studentRow(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

function statusButton(page: Page, name: string, status: AttendanceStatus) {
  // exact: "Falta" não pode casar com "Falta Justificada"
  return studentRow(page, name).getByRole("button", { name: STATUS_LABELS[status], exact: true });
}

async function currentStatus(page: Page, name: string): Promise<AttendanceStatus | null> {
  for (const status of Object.keys(STATUS_LABELS) as AttendanceStatus[]) {
    if ((await statusButton(page, name, status).getAttribute("aria-pressed")) === "true") return status;
  }
  return null;
}

// Status diferente do atual, para que a gravação seja visível
async function statusOtherThanCurrent(page: Page, name: string): Promise<AttendanceStatus> {
  const current = await currentStatus(page, name);
  const options: AttendanceStatus[] = ["LATE", "JUSTIFIED_ABSENCE", "ABSENT", "PRESENT"];
  return options.find((status) => status !== current)!;
}

function timeLabel(recordedAt: string): RegExp {
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(recordedAt));
  return new RegExp(`às ${time}`);
}

async function openAttendance(page: Page) {
  await page.goto(`/sessions/${sessionId}/attendance`);
  await expect(studentRow(page, studentName)).toBeVisible();
}

// Clica no status e espera o PUT real; a URL da API é derivada do tráfego do frontend
async function registerStatus(page: Page, status: AttendanceStatus) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PUT" && ATTENDANCE_ROUTE.test(res.url())),
    statusButton(page, studentName, status).click(),
  ]);
  attendanceUrl = response.url();
  expect(response.request().postDataJSON()).toEqual({ status });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { id: string; status: AttendanceStatus; recordedAt: string };
  expect(body.status).toBe(status);
  return body;
}

test.beforeAll(() => {
  sessionId = requiredEnv(
    "E2E_SESSION_ID",
    "the UUID of a tutoring session whose room Tutor is E2E_USER_ID and that lists E2E_STUDENT_NAME and E2E_OTHER_STUDENT_NAME",
  );
  studentName = requiredEnv("E2E_STUDENT_NAME", "the name of an active student listed in E2E_SESSION_ID");
  otherStudentName = requiredEnv("E2E_OTHER_STUDENT_NAME", "the name of another active student listed in E2E_SESSION_ID");
  otherTutorId = requiredEnv("E2E_OTHER_TUTOR_ID", "the UUID of a user who is the Tutor of another room, not of E2E_SESSION_ID");
});

test.beforeEach(async ({ page }) => {
  attendanceUrl = undefined;
  await openAttendance(page);
  originalStatus = await currentStatus(page, studentName);
});

// Restaura o status original; sem registro anterior não há como apagar (a US09 não tem DELETE)
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  if (attendanceUrl && originalStatus) {
    await page.request.put(attendanceUrl, { data: { status: originalStatus } });
  }
});

test("[E2E][US09] Tutor registra e altera a presença; o horário vem do servidor e persiste após recarregar", async ({ page }) => {
  // 1) Registro
  const first = await statusOtherThanCurrent(page, studentName);
  const registered = await registerStatus(page, first);

  await expect(statusButton(page, studentName, first)).toHaveAttribute("aria-pressed", "true");
  await expect(studentRow(page, studentName)).toContainText(timeLabel(registered.recordedAt));

  await page.reload();
  await expect(statusButton(page, studentName, first)).toHaveAttribute("aria-pressed", "true");
  await expect(studentRow(page, studentName)).toContainText(timeLabel(registered.recordedAt));

  // 2) Alteração: mesma linha no banco, horário novo
  const second = await statusOtherThanCurrent(page, studentName);
  const changed = await registerStatus(page, second);

  expect(changed.id).toBe(registered.id);
  expect(new Date(changed.recordedAt).getTime()).toBeGreaterThanOrEqual(new Date(registered.recordedAt).getTime());

  await page.reload();
  await expect(statusButton(page, studentName, second)).toHaveAttribute("aria-pressed", "true");
  await expect(statusButton(page, studentName, first)).toHaveAttribute("aria-pressed", "false");
  await expect(studentRow(page, studentName)).toContainText(timeLabel(changed.recordedAt));
});

test("[E2E][US09][QA] Com a rede lenta, a marcação aparece na hora, a lista segue utilizável, o timeout é avisado e o reenvio salva", async ({ page }) => {
  // O teste espera os 8 s do timeout real do service
  test.setTimeout(45_000);
  const target = await statusOtherThanCurrent(page, studentName);
  const statusBefore = await currentStatus(page, studentName);

  // 1) Throttling: o PUT do aluno fica retido e nunca chega ao backend
  let heldRoute: Route | undefined;
  await page.route(ATTENDANCE_ROUTE, async (route) => {
    if (route.request().method() === "PUT" && !heldRoute) {
      heldRoute = route;
      return;
    }
    await route.continue();
  });

  await statusButton(page, studentName, target).click();

  // A marcação aparece sem esperar a resposta
  await expect(statusButton(page, studentName, target)).toHaveAttribute("aria-pressed", "true");
  // Nada cobre a lista: o botão de outro aluno continua recebendo toques (trial não dispara a ação)
  await statusButton(page, otherStudentName, "PRESENT").click({ trial: true, timeout: 2_000 });
  await statusButton(page, studentName, "PRESENT").click({ trial: true, timeout: 2_000 });

  // 2) Sem resposta em 8 segundos: aviso de timeout e marcação desfeita
  // O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
  await expect(page.getByRole("alert").filter({ hasText: TIMEOUT_MESSAGE })).toBeVisible({ timeout: 12_000 });
  await expect(statusButton(page, studentName, target)).toHaveAttribute("aria-pressed", "false");
  if (statusBefore) {
    await expect(statusButton(page, studentName, statusBefore)).toHaveAttribute("aria-pressed", "true");
  }

  // O PUT retido era o do aluno tocado, com o status escolhido
  expect(heldRoute, "o PUT do registro não saiu do frontend").toBeDefined();
  expect(heldRoute!.request().url()).toMatch(ATTENDANCE_ROUTE);
  expect(heldRoute!.request().postDataJSON()).toEqual({ status: target });

  await heldRoute!.abort().catch(() => undefined);
  await page.unroute(ATTENDANCE_ROUTE);

  // O envio que expirou não gravou nada. Uma aba nova lê o estado salvo sem apagar o aviso desta página
  const freshPage = await page.context().newPage();
  await openAttendance(freshPage);
  await expect(statusButton(freshPage, studentName, target)).toHaveAttribute("aria-pressed", "false");
  if (statusBefore) {
    await expect(statusButton(freshPage, studentName, statusBefore)).toHaveAttribute("aria-pressed", "true");
  }
  await freshPage.close();
  await expect(page.getByRole("alert").filter({ hasText: TIMEOUT_MESSAGE })).toBeVisible();

  // 3) A rede volta: o reenvio grava e o aviso some
  const resent = await registerStatus(page, target);
  await expect(page.getByRole("alert").filter({ hasText: TIMEOUT_MESSAGE })).toHaveCount(0);
  await expect(studentRow(page, studentName)).toContainText(timeLabel(resent.recordedAt));

  await page.reload();
  await expect(statusButton(page, studentName, target)).toHaveAttribute("aria-pressed", "true");
});

test("[E2E][US09] Botões de status têm área de toque de no mínimo 44x44 pixels no celular", async ({ page }) => {
  // Aqui o layout é real, ao contrário do jsdom: mede a caixa renderizada no tamanho de um celular
  await page.setViewportSize({ width: 375, height: 667 });
  await openAttendance(page);

  for (const status of Object.keys(STATUS_LABELS) as AttendanceStatus[]) {
    const box = await statusButton(page, studentName, status).boundingBox();
    expect(box, `botão ${STATUS_LABELS[status]} sem caixa renderizada`).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("[E2E][US09] Tutor de outra sala recebe 403 ao alterar a presença e o status salvo não muda", async ({ page, playwright }) => {
  const saved = await statusOtherThanCurrent(page, studentName);
  const registered = await registerStatus(page, saved);
  const attempt = await statusOtherThanCurrent(page, studentName);

  // A requisição sai direto para a API com a identidade do tutor de outra sala
  const intruder = await playwright.request.newContext({ extraHTTPHeaders: { "X-User-Id": otherTutorId } });
  const response = await intruder.put(attendanceUrl!, { data: { status: attempt } });
  const body = await response.text();
  await intruder.dispose();

  expect(response.status()).toBe(403);
  // O 403 do backend é texto puro, não JSON
  expect(body).toMatch(FORBIDDEN_MESSAGE);

  await page.reload();
  await expect(statusButton(page, studentName, saved)).toHaveAttribute("aria-pressed", "true");
  await expect(statusButton(page, studentName, attempt)).toHaveAttribute("aria-pressed", "false");
  await expect(studentRow(page, studentName)).toContainText(timeLabel(registered.recordedAt));
});
