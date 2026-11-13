import { expect, request as apiRequest, test, type APIRequestContext, type Page, type Response } from "@playwright/test";

// Objetivo da US24: o tutor remove um aluno da sala sem apagar o histórico (soft delete do vínculo).
// QA: 403 para quem não é o tutor. Tudo passa pelo backend real (perfil e2e, que autentica pelo header X-User-Id).
//
// Execução (frontend/playwright.config.ts + tests/global-setup.e2e.ts):
//   docker compose -f docker-compose.e2e.yml up   -> backend em :8081 no perfil e2e
//   npm run test:e2e                               -> sobe o Next em :3001 e chama o seed
// Cada teste cria a própria sala (tutor do seed) e matricula alunos novos pelas rotas reais de cadastro e ingresso:
// nenhum aluno da sala compartilhada do seed (E2E_ROOM_ID, usada por outras specs) é removido.

const ROOMS_API = "/api/v1/rooms";
const REGISTER_API = "/api/v1/auth/register";
const JOIN_API = "/api/v1/rooms/join";
const STUDENTS_ROUTE = /\/api\/v1\/rooms\/[^/]+\/students$/;
const REMOVE_ROUTE = /\/api\/v1\/rooms\/[^/]+\/(members|students)\/[^/]+$/;

// Textos do front (mesmos dos testes unitários: tests/US24/fixtures.ts)
const FORBIDDEN_MESSAGE = /tutor/i;
const REMOVED_MESSAGE = /removid/i;
const HISTORY_PRESERVED_WARNING = /hist[óo]rico.*preservad/i;
const ACCESS_REVOKED_WARNING = /acesso.*revogad/i;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// O card do aluno é o botão de remoção com o nome dele: o toast pode citar o nome sem confundir a verificação
const removeButtonName = (name: string) => new RegExp(`remover.*${escapeRegExp(name)}`, "i");
const cardOf = (page: Page, person: Person) => page.getByRole("button", { name: removeButtonName(person.name) });

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

interface Person {
  id: string;
  name: string;
}

let tutorId: string;
let tutorName: string;
let otherTutorId: string;
let roomId: string;
let alice: Person;
let bruno: Person;

test.beforeAll(() => {
  tutorId = requiredEnv("E2E_TUTOR_ID", "the UUID of the seeded tutor (the same as E2E_USER_ID, used by the browser)");
  tutorName = requiredEnv("E2E_TUTOR_NAME", "the name of E2E_TUTOR_ID");
  otherTutorId = requiredEnv("E2E_OTHER_TUTOR_ID", "the UUID of a tutor who does not own the rooms created here");
});

function apiAs(baseURL: string | undefined, userId?: string): Promise<APIRequestContext> {
  return apiRequest.newContext({ baseURL, extraHTTPHeaders: userId ? { "X-User-Id": userId } : {} });
}

async function registerStudent(baseURL: string | undefined, label: string): Promise<Person> {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const name = `QA US24 ${label} ${unique}`;
  const api = await apiAs(baseURL);
  const response = await api.post(REGISTER_API, {
    multipart: {
      data: {
        name: "data.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ name, email: `qa.us24.${label.toLowerCase()}.${unique}@uefs.br`, password: "SenhaForte@2026" })),
      },
    },
  });
  const body = await response.json().catch(() => null);
  await api.dispose();
  expect(response.status(), `cadastro de ${label}: ${JSON.stringify(body)}`).toBe(201);
  return { id: String(body.id), name };
}

async function joinRoom(baseURL: string | undefined, student: Person, accessCode: string) {
  const api = await apiAs(baseURL, student.id);
  const response = await api.post(JOIN_API, { data: { accessCode } });
  await api.dispose();
  expect(response.status(), `ingresso de ${student.name}`).toBe(200);
}

// Membros ativos da sala, vistos pelo tutor dono
async function activeMemberIds(baseURL: string | undefined): Promise<string[]> {
  const api = await apiAs(baseURL, tutorId);
  const response = await api.get(`${ROOMS_API}/${roomId}/members`);
  const members = (await response.json()) as Array<{ id: string }>;
  await api.dispose();
  expect(response.status()).toBe(200);
  return members.map((member) => String(member.id));
}

async function deleteAs(baseURL: string | undefined, userId: string, studentId: string) {
  const api = await apiAs(baseURL, userId);
  const response = await api.delete(`${ROOMS_API}/${roomId}/members/${studentId}`);
  await api.dispose();
  return response.status();
}

test.beforeEach(async ({ baseURL }) => {
  const api = await apiAs(baseURL, tutorId);
  const created = await api.post(ROOMS_API, { data: { name: `QA US24 Sala ${Date.now()}` } });
  const room = await created.json();
  await api.dispose();
  expect(created.status(), "o tutor do seed cria a sala do teste").toBe(201);
  roomId = String(room.id);

  alice = await registerStudent(baseURL, "Alice");
  bruno = await registerStudent(baseURL, "Bruno");
  await joinRoom(baseURL, alice, String(room.code));
  await joinRoom(baseURL, bruno, String(room.code));
});

test.afterEach(async ({ baseURL }) => {
  const api = await apiAs(baseURL, tutorId);
  await api.delete(`${ROOMS_API}/${roomId}`).catch(() => undefined);
  await api.dispose();
});

// Aba "Pessoas" da sala, onde fica o carômetro com a remoção; espera a lista real chegar
async function openPeopleTab(page: Page) {
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "GET" && STUDENTS_ROUTE.test(res.url()) && res.ok()),
    page.goto(`/teacher-rooms/${roomId}/disciplines?tab=people`),
  ]);
  await expect(cardOf(page, alice)).toBeVisible();
}

function trackRemovals(page: Page) {
  const removals: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "DELETE" && REMOVE_ROUTE.test(req.url())) removals.push(req.url());
  });
  return removals;
}

async function confirmRemovalOf(page: Page, student: Person): Promise<Response> {
  await page.getByRole("button", { name: removeButtonName(student.name) }).click();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "DELETE" && REMOVE_ROUTE.test(res.url())),
    page.getByRole("dialog").getByRole("button", { name: /^remover$/i }).click(),
  ]);
  return response;
}

test("[E2E][US24] Tutor remove o aluno após o aviso: só o vínculo é desativado, a lista atualiza sem recarregar e o acesso do aluno é revogado", async ({ page, baseURL }) => {
  await openPeopleTab(page);
  const removals = trackRemovals(page);
  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });

  // CA1: o aviso aparece antes de qualquer DELETE
  await page.getByRole("button", { name: removeButtonName(alice.name) }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(alice.name);
  await expect(dialog).toContainText(HISTORY_PRESERVED_WARNING);
  await expect(dialog).toContainText(ACCESS_REVOKED_WARNING);
  expect(removals).toHaveLength(0);

  // CA2: confirmar
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "DELETE" && REMOVE_ROUTE.test(res.url())),
    dialog.getByRole("button", { name: /^remover$/i }).click(),
  ]);

  expect(response.status()).toBe(204);
  expect(response.url()).toContain(`/api/v1/rooms/${roomId}/`);
  expect(response.url()).toMatch(new RegExp(`/${alice.id}$`));
  expect(removals).toHaveLength(1);
  await expect(page.getByRole("status").filter({ hasText: REMOVED_MESSAGE })).toBeVisible();
  await expect(cardOf(page, alice)).toHaveCount(0);
  await expect(cardOf(page, bruno)).toBeVisible();
  expect(navigations, "a lista atualiza sem recarregar a página").toEqual([]);

  // Backend: Alice saiu, Bruno continua
  const members = await activeMemberIds(baseURL);
  expect(members).not.toContain(alice.id);
  expect(members).toContain(bruno.id);
  // Acesso revogado: a sala some da lista da Alice e o carômetro passa a recusá-la
  const asAlice = await apiAs(baseURL, alice.id);
  const aliceRooms = (await (await asAlice.get(ROOMS_API)).json()) as Array<{ id: string }>;
  const aliceRoster = await asAlice.get(`${ROOMS_API}/${roomId}/members`);
  await asAlice.dispose();
  expect(aliceRooms.map((room) => String(room.id))).not.toContain(roomId);
  expect(aliceRoster.status()).toBe(403);
});

test("[E2E][US24] Cancelar a confirmação não chama a API e mantém o aluno na sala", async ({ page, baseURL }) => {
  await openPeopleTab(page);
  const removals = trackRemovals(page);

  await page.getByRole("button", { name: removeButtonName(alice.name) }).click();
  await page.getByRole("dialog").getByRole("button", { name: /cancelar/i }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(cardOf(page, alice)).toBeVisible();
  expect(removals).toHaveLength(0);
  expect(await activeMemberIds(baseURL)).toContain(alice.id);
});

test("[E2E][US24] O tutor não aparece como removível no carômetro", async ({ page }) => {
  await openPeopleTab(page);

  await expect(cardOf(page, alice)).toBeVisible();
  await expect(page.getByRole("button", { name: removeButtonName(tutorName) })).toHaveCount(0);
});

test("[E2E][US24][QA] Quando o backend recusa com 403, a tela avisa em português e o aluno continua na sala", async ({ page, baseURL }) => {
  await openPeopleTab(page);
  // A sessão perde a posse da sala só para o DELETE: o pedido sai como outro tutor e a recusa vem do backend real
  await page.route(REMOVE_ROUTE, async (route) => {
    await route.continue({ headers: { ...route.request().headers(), "x-user-id": otherTutorId } });
  });

  const response = await confirmRemovalOf(page, alice);

  expect(response.status()).toBe(403);
  await expect(page.getByRole("alert").filter({ hasText: FORBIDDEN_MESSAGE })).toBeVisible();
  await expect(cardOf(page, alice)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: REMOVED_MESSAGE })).toHaveCount(0);
  expect(await activeMemberIds(baseURL)).toContain(alice.id);
});

test("[E2E][US24][QA] Tutor de outra sala e aluno da própria sala recebem 403 ao forçar a API, e o vínculo continua ativo", async ({ baseURL }) => {
  expect(await deleteAs(baseURL, otherTutorId, alice.id)).toBe(403);
  expect(await deleteAs(baseURL, bruno.id, alice.id)).toBe(403);

  expect(await activeMemberIds(baseURL)).toEqual(expect.arrayContaining([alice.id, bruno.id]));
});
