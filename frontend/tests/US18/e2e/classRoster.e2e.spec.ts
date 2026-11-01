import { expect, test, type Locator, type Page, type Response } from "@playwright/test";

const ROSTER_ROUTE = /\/api\/v1\/rooms\/[^/?]+\/roster(\?.*)?$/;

// Contrato do ClassRosterDTO e do PageResponse (backend da US18)
interface RosterStudent {
  id: string;
  name: string;
  profileImageUrl: string | null;
  initials: string;
}

interface RosterPage {
  content: RosterStudent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let roomId: string;

// Valor único da execução: o teste intercepta esta URL e responde 404, como um link quebrado
const BROKEN_PHOTO_PATH = `/e2e-us18/link-quebrado-${Date.now()}.png`;

test.beforeAll(() => {
  roomId = requiredEnv(
    "E2E_ROOM_ID",
    "the UUID of a room whose Tutor is E2E_USER_ID, with at least one active student without a photo, " +
      "at least one with a photo, and every photo URL reachable",
  );
});

function isRosterGet(res: Response) {
  return res.request().method() === "GET" && ROSTER_ROUTE.test(res.url());
}

// Aba "Pessoas" da sala, onde fica o carômetro
async function openRoster(page: Page) {
  await page.goto(`/teacher-rooms/${roomId}/disciplines?tab=people`);
}

// A grade é a lista que contém o aluno: outras listas da tela não entram na contagem
function rosterGrid(page: Page, anyStudent: RosterStudent): Locator {
  return page.getByRole("list").filter({ hasText: anyStudent.name });
}

test("[E2E][US18] Tutor abre o carômetro e vê todos os alunos da sala, com foto lazy ou as iniciais", async ({ page }) => {
  const responses: Response[] = [];
  page.on("response", (res) => {
    if (isRosterGet(res)) responses.push(res);
  });

  const [firstResponse] = await Promise.all([page.waitForResponse(isRosterGet), openRoster(page)]);

  const first = (await firstResponse.json()) as RosterPage;
  expect(firstResponse.url()).toContain(`/api/v1/rooms/${roomId}/roster`);
  expect(firstResponse.status()).toBe(200);
  expect(first.totalElements, "E2E_ROOM_ID precisa ter alunos ativos").toBeGreaterThan(0);

  // O front pede todas as páginas, não só a primeira. Conta páginas distintas: em modo dev,
  // o StrictMode do React monta o componente duas vezes e repete a busca
  const pageOf = (res: Response) => new URL(res.url()).searchParams.get("page");
  await expect.poll(() => new Set(responses.map(pageOf)).size).toBe(first.totalPages);
  const pages = new Map<number, RosterPage>();
  for (const res of responses) {
    expect(res.url()).toContain(`/api/v1/rooms/${roomId}/roster`);
    const body = (await res.json()) as RosterPage;
    pages.set(body.page, body);
  }
  const students = [...pages.values()]
    .sort((a, b) => a.page - b.page)
    .flatMap((rosterPage) => rosterPage.content);
  expect(students).toHaveLength(first.totalElements);

  const grid = rosterGrid(page, students[0]);
  const items = grid.getByRole("listitem");
  await expect(items).toHaveCount(students.length);

  const withPhoto = students.filter((student) => student.profileImageUrl !== null);
  expect(withPhoto.length, "E2E_ROOM_ID precisa ter um aluno com foto").toBeGreaterThan(0);
  expect(withPhoto.length, "E2E_ROOM_ID precisa ter um aluno sem foto").toBeLessThan(students.length);

  for (const [index, student] of students.entries()) {
    const item = items.nth(index);
    // Mesma ordem da resposta do servidor
    await expect(item).toContainText(student.name);
    if (student.profileImageUrl === null) {
      await expect(item.locator("img")).toHaveCount(0);
      await expect(item.getByText(student.initials, { exact: true })).toBeVisible();
    } else {
      // A foto é a do backend, e o download fica a cargo do lazy loading do navegador
      const photo = item.locator("img");
      await expect(photo).toHaveAttribute("src", student.profileImageUrl);
      await expect(photo).toHaveAttribute("loading", "lazy");
    }
  }
});

test("[E2E][US18][QA] Link de imagem quebrado de propósito: o carômetro mostra o avatar com as iniciais, sem o ícone de imagem quebrada", async ({ page, baseURL }) => {
  const brokenPhotoUrl = new URL(BROKEN_PHOTO_PATH, baseURL).href;
  let brokenPhotoRequested = false;
  // O link quebrado: o navegador tenta baixar e recebe 404
  await page.route(brokenPhotoUrl, async (route) => {
    brokenPhotoRequested = true;
    await route.fulfill({ status: 404, contentType: "text/plain", body: "Not Found" });
  });

  // A resposta real do backend passa adiante, só com a foto do primeiro aluno trocada pelo link quebrado
  let target: RosterStudent | undefined;
  await page.route(ROSTER_ROUTE, async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as RosterPage;
    if (body.page === 0 && body.content.length > 0) {
      target = body.content[0];
      body.content[0] = { ...target, profileImageUrl: brokenPhotoUrl };
    }
    await route.fulfill({ response, json: body });
  });

  await Promise.all([page.waitForResponse(isRosterGet), openRoster(page)]);

  expect(target, "E2E_ROOM_ID precisa ter alunos ativos").toBeDefined();
  const student = target as RosterStudent;
  const item = rosterGrid(page, student).getByRole("listitem").first();
  await expect(item).toContainText(student.name);

  // O navegador chegou a pedir a imagem: a troca é reação à falha, não à ausência de foto
  await expect.poll(() => brokenPhotoRequested).toBe(true);
  await expect(item.locator("img")).toHaveCount(0);
  await expect(item.getByText(student.initials, { exact: true })).toBeVisible();

  // Nenhuma imagem da grade ficou no estado quebrado, que é quando o navegador desenha o ícone nativo
  await expect
    .poll(() =>
      rosterGrid(page, student)
        .locator("img")
        .evaluateAll((imgs) =>
          (imgs as HTMLImageElement[]).filter((img) => img.complete && img.naturalWidth === 0).length,
        ),
    )
    .toBe(0);
});
