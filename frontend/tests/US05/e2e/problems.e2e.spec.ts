import { expect, test, type Page, type Response } from "@playwright/test";

const PROBLEM_ROUTE = /\/api\/v1\/problems\/[^/?#]+$/;

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let roomId: string;
let studentId: string;
let createdProblemUrls: string[];

function roomProblemsRoute(): RegExp {
  return new RegExp(`/api/v1/rooms/${roomId}/problems$`);
}

function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function problemItem(page: Page, title: string) {
  return page.getByRole("listitem").filter({ hasText: title });
}

// A URL do problema é derivada do tráfego real do frontend, sem supor onde o backend está
function problemUrl(createResponse: Response, problemId: string): string {
  return new URL(`/api/v1/problems/${problemId}`, createResponse.url()).toString();
}

async function openRoomProblems(page: Page) {
  await page.goto(`/rooms/${roomId}/problems`);
}

async function createProblem(page: Page, title: string): Promise<string> {
  await page.getByRole("button", { name: /criar novo problema/i }).click();
  await page.getByLabel(/título/i).fill(title);

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && roomProblemsRoute().test(res.url())),
    page.getByRole("button", { name: /^criar$/i }).click(),
  ]);
  expect(response.request().postDataJSON()).toEqual({ title });
  expect(response.status()).toBe(201);

  const url = problemUrl(response, (await response.json()).id);
  createdProblemUrls.push(url);
  await expect(problemItem(page, title)).toBeVisible();
  return url;
}

test.beforeAll(() => {
  roomId = requiredEnv("E2E_ROOM_ID", "the UUID of a room whose Tutor is E2E_USER_ID");
  studentId = requiredEnv("E2E_STUDENT_ID", "the UUID of an existing user who is not the Tutor of E2E_ROOM_ID");
});

test.beforeEach(async ({ page }) => {
  createdProblemUrls = [];
  await openRoomProblems(page);
});

test.afterEach(async ({ page }) => {
  for (const url of createdProblemUrls) {
    await page.request.delete(url);
  }
});

test("[E2E][US05] Tutor creates, lists, renames and deletes a problem", async ({ page }) => {
  const title = uniqueTitle("E2E Problem");
  const renamed = uniqueTitle("E2E Renamed Problem");

  const url = await createProblem(page, title);

  await page.reload();
  await expect(problemItem(page, title)).toBeVisible();

  await problemItem(page, title).getByRole("button", { name: /editar/i }).click();
  await page.getByLabel(/título/i).fill(renamed);
  const [putRequest] = await Promise.all([
    page.waitForRequest((req) => req.method() === "PUT" && PROBLEM_ROUTE.test(req.url())),
    page.getByRole("button", { name: /salvar/i }).click(),
  ]);
  expect(putRequest.url()).toBe(url);
  expect(putRequest.postDataJSON()).toEqual({ title: renamed });
  await expect(problemItem(page, renamed)).toBeVisible();
  await expect(problemItem(page, title)).toHaveCount(0);

  const [deleteRequest] = await Promise.all([
    page.waitForRequest((req) => req.method() === "DELETE" && PROBLEM_ROUTE.test(req.url())),
    problemItem(page, renamed).getByRole("button", { name: /excluir/i }).click(),
  ]);
  expect(deleteRequest.url()).toBe(url);
  await expect(problemItem(page, renamed)).toHaveCount(0);

  await page.reload();
  await expect(problemItem(page, renamed)).toHaveCount(0);
});

test("[E2E][US05] Problems are listed in the order they were created", async ({ page }) => {
  const prefix = uniqueTitle("E2E Order");
  const titles = [`${prefix} A`, `${prefix} B`, `${prefix} C`];

  for (const title of titles) {
    await createProblem(page, title);
  }

  await page.reload();
  const createdItems = page.getByRole("listitem").filter({ hasText: prefix });
  await expect(createdItems).toHaveCount(titles.length);
  await expect(createdItems).toContainText(titles);
});

test("[E2E][US05][QA] A student's PUT is blocked with 403 and the title is kept", async ({ page, playwright }) => {
  const title = uniqueTitle("E2E Protected Problem");
  const url = await createProblem(page, title);

  // Mesmo roteiro da subtarefa de QA: a requisição sai direto para a API com a identidade do aluno
  const student = await playwright.request.newContext({ extraHTTPHeaders: { "X-User-Id": studentId } });
  const response = await student.put(url, { data: { title: "Hijacked Title" } });
  await student.dispose();

  expect(response.status()).toBe(403);
  await page.reload();
  await expect(problemItem(page, title)).toBeVisible();
  await expect(problemItem(page, "Hijacked Title")).toHaveCount(0);
});
