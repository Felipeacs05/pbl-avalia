import { expect, test, type Page } from "@playwright/test";

const NAME_VALIDATION_MESSAGE = /entre 3 e 100 caracteres/i;
const ROOMS_ROUTE = /\/api\/v1\/rooms(\/[^/?#]+)?$/;

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function roomCard(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

async function createRoom(page: Page, name: string) {
  await page.getByRole("button", { name: /criar nova sala/i }).click();
  await page.getByLabel(/nome da sala/i).fill(name);

  const [request] = await Promise.all([
    page.waitForRequest((req) => req.method() === "POST" && ROOMS_ROUTE.test(req.url())),
    page.getByRole("button", { name: /^criar$/i }).click(),
  ]);
  expect(request.postDataJSON()).toEqual({ name });

  await expect(roomCard(page, name)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("[E2E][US03] Tutor creates, lists, renames and deletes a room", async ({ page }) => {
  const name = uniqueName("E2E Room");
  const renamed = `${name} Renamed`;

  await createRoom(page, name);

  await page.reload();
  await expect(roomCard(page, name)).toBeVisible();

  await roomCard(page, name).getByRole("button", { name: /editar/i }).click();
  await page.getByLabel(/nome da sala/i).fill(renamed);
  const [putRequest] = await Promise.all([
    page.waitForRequest((req) => req.method() === "PUT" && ROOMS_ROUTE.test(req.url())),
    page.getByRole("button", { name: /salvar/i }).click(),
  ]);
  expect(putRequest.postDataJSON()).toEqual({ name: renamed });
  await expect(roomCard(page, renamed)).toBeVisible();

  const [deleteRequest] = await Promise.all([
    page.waitForRequest((req) => req.method() === "DELETE" && ROOMS_ROUTE.test(req.url())),
    roomCard(page, renamed).getByRole("button", { name: /excluir/i }).click(),
  ]);
  expect(deleteRequest.url()).toBe(putRequest.url());
  await expect(roomCard(page, renamed)).toHaveCount(0);

  await page.reload();
  await expect(roomCard(page, renamed)).toHaveCount(0);
});

test("[E2E][US03][QA] A name with fewer than 3 characters is blocked and nothing is sent", async ({ page }) => {
  const postRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && ROOMS_ROUTE.test(request.url())) {
      postRequests.push(request.url());
    }
  });

  await page.getByRole("button", { name: /criar nova sala/i }).click();
  await page.getByLabel(/nome da sala/i).fill("AB");
  await page.getByRole("button", { name: /^criar$/i }).click();

  // O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
  await expect(page.getByRole("alert").filter({ hasText: NAME_VALIDATION_MESSAGE })).toBeVisible();
  expect(postRequests).toHaveLength(0);
});

test("[E2E][US03][QA] Copying the link saves the join URL to the clipboard and shows a success toast", async ({
  page,
  baseURL,
}) => {
  const name = uniqueName("E2E Link Room");
  await createRoom(page, name);

  await roomCard(page, name).getByRole("button", { name: /copiar link/i }).click();

  await expect(page.getByText(/link copiado/i)).toBeVisible();
  const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copied.origin).toBe(new URL(baseURL!).origin);
  expect(copied.pathname).toMatch(/^\/app\/join\/[A-Za-z0-9]+$/);
});
