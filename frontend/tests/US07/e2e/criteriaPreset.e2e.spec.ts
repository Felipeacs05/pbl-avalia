import { expect, test, type Page } from "@playwright/test";

// O pré-set ainda é simulado no cliente (criteriaPresetService usa o mock em memória): nada é gravado no backend.
// Cada page.goto começa do pré-set inicial, então não há o que limpar no afterEach além das rotas interceptadas.
const INVALID_CHARACTERS_MESSAGE = /caracteres inválidos/i;
const NAME_MESSAGE = /nome do critério/i;
const INITIAL_NAMES = ["Papel", "Participação", "Segmentos", "Comportamento"];

function requiredEnv(name: string, description: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} must be set to ${description}`);
    }
    return value;
}

let presetUrl: string;

function criteriaRegion(page: Page) {
    return page.getByRole("region", { name: "Critérios" });
}

function criteriaItems(page: Page) {
    return criteriaRegion(page).getByRole("listitem");
}

function totalSum(page: Page) {
    return page.getByRole("status");
}

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function alertWith(page: Page, text: RegExp) {
    return page.getByRole("alert").filter({ hasText: text });
}

async function addCriterion(page: Page, name: string, weight = "0") {
    await page.getByRole("button", { name: "Adicionar Critério" }).click();
    const dialog = page.getByRole("dialog", { name: "Adicionar Critério" });
    await dialog.getByLabel("Nome do critério").fill(name);
    await dialog.getByLabel(/peso/i).fill(weight);
    await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
}

test.beforeAll(() => {
    const roomId = requiredEnv("E2E_ROOM_ID", "the UUID of a room whose Tutor is E2E_USER_ID");
    const problemId = requiredEnv("E2E_PROBLEM_ID", "the UUID of a problem of the room E2E_ROOM_ID");
    presetUrl = `/teacher-rooms/${roomId}/problems/${problemId}/preset`;
});

test.beforeEach(async ({ page }) => {
    await page.goto(presetUrl);
    await expect(criteriaRegion(page)).toBeVisible();
});

test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("[E2E][US07] Tutor adiciona e remove critérios na mesma tela, sem recarregar a página nem chamar a API de critérios", async ({ page }) => {
    // Marca na janela: se a página recarregar, a marca some
    await page.evaluate(() => {
        (window as unknown as { __spaMarker?: string }).__spaMarker = "vivo";
    });
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    const criteriaRequests: string[] = [];
    page.on("request", (request) => {
        const { pathname } = new URL(request.url());
        if (/performance-tables|criteria-preset|\/criteria/.test(pathname)) criteriaRequests.push(pathname);
    });

    await addCriterion(page, "Pesquisa");
    await expect(criteriaItems(page)).toHaveCount(INITIAL_NAMES.length + 1);
    await expect(criteriaItems(page).filter({ hasText: "Pesquisa" })).toBeVisible();
    await expect(page.getByText("Há alterações não salvas.")).toBeVisible();

    await page.getByRole("button", { name: "Remover Pesquisa" }).click();
    await expect(criteriaItems(page)).toHaveCount(INITIAL_NAMES.length);
    await expect(criteriaItems(page).filter({ hasText: "Pesquisa" })).toHaveCount(0);

    expect(await page.evaluate(() => (window as unknown as { __spaMarker?: string }).__spaMarker)).toBe("vivo");
    expect(navigations).toEqual([]);
    expect(criteriaRequests).toEqual([]);
});

test("[E2E][US07] Nome vazio é bloqueado na hora, o modal continua aberto e nenhum critério é incluído", async ({ page }) => {
    await page.getByRole("button", { name: "Adicionar Critério" }).click();
    const dialog = page.getByRole("dialog", { name: "Adicionar Critério" });
    await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();

    await expect(alertWith(page, NAME_MESSAGE)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Nome do critério")).toHaveAttribute("aria-invalid", "true");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(criteriaItems(page)).toHaveCount(INITIAL_NAMES.length);
});

test("[E2E][US07] A soma dos pesos é recalculada na hora: vermelha fora de 100% e verde em 100%", async ({ page }) => {
    await expect(totalSum(page)).toHaveText("100%");
    await expect(totalSum(page)).toHaveClass(/text-green-/);

    await addCriterion(page, "Pesquisa", "5");
    await expect(totalSum(page)).toHaveText("105%");
    await expect(totalSum(page)).toHaveClass(/text-red-/);

    await page.getByRole("button", { name: "Remover Pesquisa" }).click();
    await expect(totalSum(page)).toHaveText("100%");
    await expect(totalSum(page)).toHaveClass(/text-green-/);
});

test("[E2E][US07][QA] Nome com <script> é bloqueado no front e não entra na lista (CT-FE-04)", async ({ page }) => {
    const name = "<script>alert('XSS')</script>";

    await page.getByRole("button", { name: "Adicionar Critério" }).click();
    const dialog = page.getByRole("dialog", { name: "Adicionar Critério" });
    await dialog.getByLabel("Nome do critério").fill(name);
    await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();

    await expect(alertWith(page, INVALID_CHARACTERS_MESSAGE)).toBeVisible();
    await expect(criteriaItems(page).filter({ hasText: name })).toHaveCount(0);
    await expect(criteriaItems(page)).toHaveCount(INITIAL_NAMES.length);
});