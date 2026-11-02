import { expect, test, type Page, type Response } from "@playwright/test";

const INVALID_SUM_MESSAGE = /soma dos pesos deve ser exatamente 100%/i;

type CriterionWeight = { criterionId: string; criteriaWeight: number };
type Criterion = CriterionWeight & { criteriaName: string };

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let tableId: string;
let weightsUrl: string;
let criteria: Criterion[];
let originalWeights: CriterionWeight[];

function tableRoute(): RegExp {
  return new RegExp(`/api/v1/performance-tables/${tableId}$`);
}

function weightsRoute(): RegExp {
  return new RegExp(`/api/v1/performance-tables/${tableId}/criteria/weights$`);
}

// A URL de pesos é derivada do tráfego real do frontend, sem supor onde o backend está
function weightsUrlFrom(tableResponse: Response): string {
  return new URL(`/api/v1/performance-tables/${tableId}/criteria/weights`, tableResponse.url()).toString();
}

async function openWeightsPage(page: Page): Promise<Criterion[]> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "GET" && tableRoute().test(res.url())),
    page.goto(`/performance-tables/${tableId}/weights`),
  ]);
  expect(response.status()).toBe(200);
  weightsUrl = weightsUrlFrom(response);
  await expect(page.getByLabel(/autoavaliação/i)).toBeVisible();
  return (await response.json()).criteriaList;
}

async function fillWeights(page: Page, content: string, participation: string, selfAssessment: string) {
  await page.getByLabel(/conteúdo/i).fill(content);
  await page.getByLabel(/participação/i).fill(participation);
  await page.getByLabel(/autoavaliação/i).fill(selfAssessment);
}

async function saveWeights(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PUT" && weightsRoute().test(res.url())),
    page.getByRole("button", { name: /salvar pesos/i }).click(),
  ]);
  return response;
}

// Pesos gravados no banco, convertidos para o percentual que a tela deve exibir
function originalPercent(name: RegExp): string {
  const criterion = criteria.find((item) => name.test(item.criteriaName))!;
  return String(Math.round(criterion.criteriaWeight * 100));
}

async function expectShownWeights(page: Page, content: string, participation: string, selfAssessment: string) {
  await expect(page.getByLabel(/conteúdo/i)).toHaveValue(content);
  await expect(page.getByLabel(/participação/i)).toHaveValue(participation);
  await expect(page.getByLabel(/autoavaliação/i)).toHaveValue(selfAssessment);
}

function total(page: Page) {
  return page.getByRole("status");
}

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function invalidSumAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: INVALID_SUM_MESSAGE });
}

test.beforeAll(() => {
  tableId = requiredEnv(
    "E2E_PERFORMANCE_TABLE_ID",
    "the UUID of a performance table in a room whose Tutor is E2E_USER_ID, with exactly the criteria " +
      "'Conteúdo', 'Participação' and 'Autoavaliação' and weights summing 100%"
  );
});

test.beforeEach(async ({ page }) => {
  criteria = await openWeightsPage(page);
  originalWeights = criteria.map(({ criterionId, criteriaWeight }) => ({ criterionId, criteriaWeight }));
});

test.afterEach(async ({ page }) => {
  // Devolve a tabela à fórmula original para não deixar o ambiente alterado
  const response = await page.request.put(weightsUrl, { data: { weights: originalWeights } });
  expect(response.status()).toBe(200);
});

test("[E2E][US08] The total is recomputed in real time while typing and nothing is sent until saving", async ({
  page,
}) => {
  const putRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && weightsRoute().test(request.url())) {
      putRequests.push(request.url());
    }
  });

  // A tela abre com os pesos gravados no banco, em %, e o total verde
  await expectShownWeights(page, originalPercent(/conteúdo/i), originalPercent(/participação/i), originalPercent(/autoavaliação/i));
  await expect(total(page)).toContainText(/100\s*%/);
  await expect(total(page)).toHaveClass(/text-green-/);

  await fillWeights(page, "40", "30", "20");
  await expect(total(page)).toContainText(/90\s*%/);
  await expect(total(page)).toHaveClass(/text-red-/);

  await page.getByLabel(/autoavaliação/i).fill("30");
  await expect(total(page)).toContainText(/100\s*%/);
  await expect(total(page)).toHaveClass(/text-green-/);

  expect(putRequests).toHaveLength(0);
});

test("[E2E][US08][QA] Weights summing 90%, 110% and 100% turn red/422, red/422 and green/200, and only the 100% formula is kept", async ({
  page,
}) => {
  const idOf = (name: RegExp) => criteria.find((criterion) => name.test(criterion.criteriaName))!.criterionId;

  // 90%: vermelho na interface e recusado pela API com 422
  await fillWeights(page, "40", "30", "20");
  await expect(total(page)).toContainText(/90\s*%/);
  await expect(total(page)).toHaveClass(/text-red-/);
  const ninety = await saveWeights(page);
  expect(ninety.status()).toBe(422);
  await expect(invalidSumAlert(page)).toBeVisible();

  // 110%: vermelho na interface e recusado pela API com 422
  await page.getByLabel(/autoavaliação/i).fill("40");
  await expect(total(page)).toContainText(/110\s*%/);
  await expect(total(page)).toHaveClass(/text-red-/);
  const oneHundredTen = await saveWeights(page);
  expect(oneHundredTen.status()).toBe(422);
  await expect(invalidSumAlert(page)).toBeVisible();

  // As duas recusas não gravaram nada: recarregando, a tela volta aos pesos originais
  await page.reload();
  await expectShownWeights(page, originalPercent(/conteúdo/i), originalPercent(/participação/i), originalPercent(/autoavaliação/i));

  // 100%: verde na interface, aceito pela API e o alerta some
  await fillWeights(page, "45", "35", "20");
  await expect(total(page)).toContainText(/100\s*%/);
  await expect(total(page)).toHaveClass(/text-green-/);
  const oneHundred = await saveWeights(page);
  expect(oneHundred.status()).toBe(200);
  // Pesos em decimal, cada um ligado ao seu criterionId (a ordem segue a da tabela no banco)
  const { weights } = oneHundred.request().postDataJSON();
  expect(weights).toHaveLength(3);
  expect(weights).toEqual(
    expect.arrayContaining([
      { criterionId: idOf(/conteúdo/i), criteriaWeight: 0.45 },
      { criterionId: idOf(/participação/i), criteriaWeight: 0.35 },
      { criterionId: idOf(/autoavaliação/i), criteriaWeight: 0.2 },
    ])
  );
  await expect(invalidSumAlert(page)).toHaveCount(0);

  // Depois de recarregar, a tela mostra o que ficou gravado: só a fórmula de 100%
  await page.reload();
  await expectShownWeights(page, "45", "35", "20");
  await expect(total(page)).toHaveClass(/text-green-/);
});
