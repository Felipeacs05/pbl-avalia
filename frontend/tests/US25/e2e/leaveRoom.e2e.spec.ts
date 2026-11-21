import {
  devices,
  expect,
  request as apiRequest,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

// Objetivo da US25: o próprio aluno sai da sala tutorial; o vínculo é desativado (soft delete), os dados dele são
// mantidos e o tutor é notificado. QA: depois da saída, as rotas internas da sala ficam bloqueadas na hora.
// Tudo passa pelo backend real (perfil e2e, que autentica pelo header X-User-Id).
//
// Execução (frontend/playwright.config.ts + tests/global-setup.e2e.ts):
//   docker compose -f docker-compose.e2e.yml up   -> backend em :8081 no perfil e2e
//   npm run test:e2e                               -> sobe o Next em :3001 e chama o seed
// Cada teste cria as próprias salas (tutor do seed), um problema e um aluno novo, pelas rotas reais de cadastro e
// ingresso: nenhum aluno da sala compartilhada do seed (E2E_ROOM_ID, usada por outras specs) sai de sala.
//
// O navegador do teste é o do ALUNO: o contexto padrão do playwright.config manda o X-User-Id do tutor, por isso
// cada teste abre um contexto próprio com o X-User-Id do aluno criado.
//
// Os status 400/401/409 do POST /leave já são cobertos pelos testes de backend da US25 (RoomLeaveIntegrationTest)
// e pelos testes unitários/integração do front; aqui ficam os fluxos do aluno e o bloqueio pós-saída.
// Fora do alcance do E2E: a notificação ao tutor (não há endpoint de notificações na develop) e a preservação das
// notas/feedbacks no banco; ambas ficam nos testes de backend da US25.

const ROOMS_API = "/api/v1/rooms";
const REGISTER_API = "/api/v1/auth/register";
const JOIN_API = "/api/v1/rooms/join";
const STUDENT_ROOMS_PAGE = /\/student-rooms\/?$/;
const LEAVE_ROUTE = /\/api\/v1\/rooms\/[^/]+\/leave$/;

// Textos do front (mesmos dos testes unitários: tests/US25/fixtures.ts)
const DATA_KEPT_WARNING =
  /(dados|hist[óo]rico|notas)[\s\S]*(mantid|preservad)|(mantid|preservad)[\s\S]*(dados|hist[óo]rico|notas)/i;
const ACCESS_LOST_WARNING = /perder[áa]? (o )?acesso|acesso[^.]*(revogad|removid|encerrad|bloquead)/i;
const TUTOR_NOTIFIED_WARNING = /tutor[^.]*(notificad|avisad|informad)|(notificad|avisad|informad)[^.]*tutor/i;
const CONFIRM_BUTTON = /^sair( da sala)?$/i;
const CANCEL_BUTTON = /cancelar/i;

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

interface CreatedRoom {
  id: string;
  name: string;
  code: string;
}

let tutorId: string;
let room: CreatedRoom;
let otherRoom: CreatedRoom;
let problem: { id: string; title: string };
let student: Person;
let studentContext: BrowserContext | undefined;

test.beforeAll(() => {
  tutorId = requiredEnv("E2E_TUTOR_ID", "the UUID of the seeded tutor (the same as E2E_USER_ID)");
});

function apiAs(baseURL: string | undefined, userId?: string): Promise<APIRequestContext> {
  return apiRequest.newContext({ baseURL, extraHTTPHeaders: userId ? { "X-User-Id": userId } : {} });
}

async function createRoom(baseURL: string | undefined, label: string): Promise<CreatedRoom> {
  const api = await apiAs(baseURL, tutorId);
  const name = `QA US25 ${label} ${Date.now()}`;
  const response = await api.post(ROOMS_API, { data: { name } });
  const body = await response.json();
  await api.dispose();
  expect(response.status(), `o tutor do seed cria a sala ${label}`).toBe(201);
  return { id: String(body.id), name: String(body.name ?? name), code: String(body.code) };
}

async function createProblem(baseURL: string | undefined, roomId: string) {
  const api = await apiAs(baseURL, tutorId);
  const title = `QA US25 Problema ${Date.now()}`;
  const response = await api.post(`${ROOMS_API}/${roomId}/problems`, {
    data: { title, description: "Problema criado pelo E2E da US25" },
  });
  const body = await response.json();
  await api.dispose();
  expect(response.status(), "o tutor cria um problema na sala").toBe(201);
  return { id: String(body.id), title };
}

async function registerStudent(baseURL: string | undefined): Promise<Person> {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const name = `QA US25 Aluno ${unique}`;
  const api = await apiAs(baseURL);
  const response = await api.post(REGISTER_API, {
    multipart: {
      data: {
        name: "data.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ name, email: `qa.us25.${unique}@uefs.br`, password: "SenhaForte@2026" })),
      },
    },
  });
  const body = await response.json().catch(() => null);
  await api.dispose();
  expect(response.status(), `cadastro do aluno: ${JSON.stringify(body)}`).toBe(201);
  return { id: String(body.id), name };
}

async function joinRoom(baseURL: string | undefined, person: Person, accessCode: string) {
  const api = await apiAs(baseURL, person.id);
  const response = await api.post(JOIN_API, { data: { accessCode } });
  await api.dispose();
  expect(response.status(), `ingresso de ${person.name}`).toBe(200);
}

async function leaveAs(baseURL: string | undefined, userId: string | undefined, roomId: string) {
  const api = await apiAs(baseURL, userId);
  const response = await api.post(`${ROOMS_API}/${roomId}/leave`);
  const body = await response.json().catch(() => null);
  await api.dispose();
  return { status: response.status(), body };
}

async function getAs(baseURL: string | undefined, userId: string, path: string) {
  const api = await apiAs(baseURL, userId);
  const response = await api.get(path);
  const body = await response.json().catch(() => null);
  await api.dispose();
  return { status: response.status(), body };
}

// Salas ativas do aluno, como o backend devolve para ele
async function studentRoomIds(baseURL: string | undefined): Promise<string[]> {
  const { status, body } = await getAs(baseURL, student.id, ROOMS_API);
  expect(status).toBe(200);
  return (body as Array<{ id: string }>).map((item) => String(item.id));
}

// Membros ativos da sala, vistos pelo tutor dono
async function activeMemberIds(baseURL: string | undefined, roomId: string): Promise<string[]> {
  const { status, body } = await getAs(baseURL, tutorId, `${ROOMS_API}/${roomId}/members`);
  expect(status).toBe(200);
  return (body as Array<{ id: string }>).map((member) => String(member.id));
}

// Navegador do aluno: mesmo dispositivo do projeto (Desktop Chrome), com o X-User-Id dele
async function openStudentPage(browser: Browser, baseURL: string | undefined): Promise<Page> {
  studentContext = await browser.newContext({
    ...devices["Desktop Chrome"],
    baseURL,
    extraHTTPHeaders: { "X-User-Id": student.id },
  });
  return studentContext.newPage();
}

// A página da sala tem o layout mobile e o desktop no DOM; só um fica visível no Desktop Chrome
const visibleText = (page: Page, text: string) => page.getByText(text).filter({ visible: true });
// Card da sala na lista do aluno (o título do card); um toast pode citar o nome da sala sem confundir a verificação
const roomCard = (page: Page, name: string) => page.getByRole("heading", { name });

const dialogOf = (page: Page) => page.getByRole("dialog").or(page.getByRole("alertdialog"));
// Botão "Sair da Sala" da página (só o do layout visível); o confirmar do modal é buscado dentro do diálogo
const pageLeaveButton = (page: Page) => page.getByRole("button", { name: /sair da sala/i }).first();

function trackLeaves(page: Page) {
  const leaves: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && LEAVE_ROUTE.test(req.url())) leaves.push(req.url());
  });
  return leaves;
}

function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/") && req.method() !== "GET") writes.push(`${req.method()} ${req.url()}`);
  });
  return writes;
}

// Entra na sala pela lista do aluno (como ele faria) e espera o conteúdo real da sala chegar
async function enterRoomFromList(page: Page) {
  await page.goto("/student-rooms");
  await roomCard(page, room.name).click();
  await expect(page).toHaveURL(new RegExp(`/student-rooms/${room.id}$`));
  await expect(visibleText(page, problem.title).first()).toBeVisible();
}

// Rota interna aberta depois da saída: precisa voltar à lista sem mostrar nada da sala
async function expectBlocked(page: Page) {
  await expect(page).toHaveURL(STUDENT_ROOMS_PAGE);
  await expect(visibleText(page, problem.title)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /sair da sala/i })).toHaveCount(0);
}

test.beforeEach(async ({ baseURL }) => {
  room = await createRoom(baseURL, "Sala");
  otherRoom = await createRoom(baseURL, "Outra");
  problem = await createProblem(baseURL, room.id);
  student = await registerStudent(baseURL);
  await joinRoom(baseURL, student, room.code);
  await joinRoom(baseURL, student, otherRoom.code);
});

test.afterEach(async ({ baseURL }) => {
  await studentContext?.close();
  studentContext = undefined;
  const api = await apiAs(baseURL, tutorId);
  for (const created of [room, otherRoom]) {
    await api.delete(`${ROOMS_API}/${created.id}`).catch(() => undefined);
  }
  await api.dispose();
});

test("[E2E][US25] Aluno sai da sala após o aviso: só o vínculo é desativado e ele volta à lista sem a sala", async ({ browser, baseURL }) => {
  const page = await openStudentPage(browser, baseURL);
  await enterRoomFromList(page);
  const leaves = trackLeaves(page);
  const writes = trackWrites(page);

  // O aviso aparece antes de qualquer requisição
  await pageLeaveButton(page).click();
  const dialog = dialogOf(page);
  await expect(dialog).toContainText(room.name);
  await expect(dialog).toContainText(DATA_KEPT_WARNING);
  await expect(dialog).toContainText(ACCESS_LOST_WARNING);
  await expect(dialog).toContainText(TUTOR_NOTIFIED_WARNING);
  expect(leaves).toHaveLength(0);

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && LEAVE_ROUTE.test(res.url())),
    dialog.getByRole("button", { name: CONFIRM_BUTTON }).click(),
  ]);

  expect(response.status()).toBe(204);
  expect(response.url()).toContain(`${ROOMS_API}/${room.id}/leave`);
  // O aluno é o do cabeçalho de autenticação, e não um id enviado pelo front
  expect(response.request().postData() ?? "").not.toContain(student.id);
  // Mantendo os dados: a única escrita da saída é o /leave (nada de excluir sala, usuário ou registros)
  expect(writes).toEqual([`POST ${response.url()}`]);

  // Volta à lista, que já não mostra a sala; a outra sala do aluno continua
  await expect(page).toHaveURL(STUDENT_ROOMS_PAGE);
  await expect(roomCard(page, otherRoom.name)).toBeVisible();
  await expect(roomCard(page, room.name)).toHaveCount(0);

  // Backend: o aluno saiu só desta sala e a conta dele continua funcionando
  const rooms = await studentRoomIds(baseURL);
  expect(rooms).not.toContain(room.id);
  expect(rooms).toContain(otherRoom.id);
  expect(await activeMemberIds(baseURL, room.id)).not.toContain(student.id);

});

test("[E2E][US25] Cancelar o aviso não chama a API e o aluno continua na sala", async ({ browser, baseURL }) => {
  const page = await openStudentPage(browser, baseURL);
  await enterRoomFromList(page);
  const leaves = trackLeaves(page);

  await pageLeaveButton(page).click();
  await dialogOf(page).getByRole("button", { name: CANCEL_BUTTON }).click();

  await expect(dialogOf(page)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/student-rooms/${room.id}$`));
  await expect(visibleText(page, problem.title).first()).toBeVisible();
  expect(leaves).toHaveLength(0);
  expect(await activeMemberIds(baseURL, room.id)).toContain(student.id);

});

test("[E2E][US25][QA] Bloqueio imediato: depois da saída, Voltar e URLs internas da sala não mostram mais a sala", async ({ browser, baseURL }) => {
  const page = await openStudentPage(browser, baseURL);
  await enterRoomFromList(page);

  await pageLeaveButton(page).click();
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && LEAVE_ROUTE.test(res.url()) && res.ok()),
    dialogOf(page).getByRole("button", { name: CONFIRM_BUTTON }).click(),
  ]);
  await expect(page).toHaveURL(STUDENT_ROOMS_PAGE);

  // "Voltar" do navegador: com replace volta à lista; com push voltaria à sala e o bloqueio da página precisa agir
  await page.goBack();
  await expectBlocked(page);

  // URL da sala digitada ou guardada nos favoritos
  await page.goto(`/student-rooms/${room.id}`);
  await expectBlocked(page);

  // Rota interna de um problema da sala
  await page.goto(`/student-rooms/${room.id}/problems/${problem.id}`);
  await expectBlocked(page);

});

test("[E2E][US25][QA] Depois da saída, as rotas internas da sala recusam o aluno na API (403)", async ({ baseURL }) => {
  expect((await leaveAs(baseURL, student.id, room.id)).status).toBe(204);

  // Já protegida hoje por isRoomMemberOrOwner
  expect((await getAs(baseURL, student.id, `${ROOMS_API}/${room.id}/members`)).status).toBe(403);
  // ACHADO: hoje sem verificação de vínculo (ver tests/US25/fixtures.ts); este passo falha até o backend proteger
  expect((await getAs(baseURL, student.id, `${ROOMS_API}/${room.id}/problems`)).status).toBe(403);
  // A outra sala do aluno continua acessível
  expect((await getAs(baseURL, student.id, `${ROOMS_API}/${otherRoom.id}/members`)).status).toBe(200);
});
