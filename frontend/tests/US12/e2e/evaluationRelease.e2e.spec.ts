import { expect, test, type Page, type Response } from "@playwright/test";

// A rota de liberação é derivada do tráfego real: aceita o POST do service e o PATCH do plano de testes
const RELEASE_ROUTE = /\/api\/v1\/problems\/[^/?]+\/(?:evaluations\/release|self-assessment-release)$/;
const SELF_RELEASED_TOAST = /autoavaliação liberada com sucesso/i;

function requiredEnv(name: string, description: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} must be set to ${description}`);
    }
    return value;
}

let roomId: string;
let problemId: string;
// Requisição de liberação que gravou algo: usada para devolver o problema ao estado original
let appliedRelease: { url: string; method: string } | undefined;

function isRelease(res: Response) {
    return res.request().method() !== "GET" && RELEASE_ROUTE.test(res.url());
}

async function openProblem(page: Page) {
    await page.goto(`/teacher-rooms/${roomId}/problems/${problemId}`);
    await expect(page.getByRole("button", { name: /liberar avaliações|autoavaliação liberada/i })).toBeVisible();
}

// Abre o modal, marca a autoavaliação, confirma e espera a requisição real
async function releaseSelfEvaluation(page: Page): Promise<Response> {
    await page.getByRole("button", { name: "Liberar Avaliações", exact: true }).click();
    await page.getByRole("switch", { name: "Autoavaliação" }).click();
    const [response] = await Promise.all([
        page.waitForResponse(isRelease),
        page.getByRole("button", { name: "Liberar", exact: true }).click(),
    ]);
    return response;
}

test.beforeAll(() => {
    roomId = requiredEnv("E2E_ROOM_ID", "the UUID of a room whose Tutor is E2E_USER_ID");
    problemId = requiredEnv(
        "E2E_PROBLEM_ID",
        "the UUID of a problem of E2E_ROOM_ID with no evaluation released (the spec releases it and undoes it afterwards)",
    );
});

test.beforeEach(async ({ page }) => {
    appliedRelease = undefined;
    await openProblem(page);
});

test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    // Devolve o problema a "nada liberado" para não alterar o ambiente das outras specs
    if (appliedRelease) {
        await page.request.fetch(appliedRelease.url, { method: appliedRelease.method, data: { type: null } });
    }
});

test("[E2E][US12] Tutor libera a autoavaliação, vê o toast e o status e a liberação persiste após recarregar", async ({ page }) => {
    await expect(
        page.getByRole("button", { name: "Autoavaliação Liberada" }),
        "E2E_PROBLEM_ID já está liberado: use um problema sem liberação",
    ).toHaveCount(0);

    const response = await releaseSelfEvaluation(page);
    appliedRelease = { url: response.url(), method: response.request().method() };

    expect([200, 201, 204]).toContain(response.status());
    expect(response.request().postDataJSON()).toEqual({ type: "self_evaluation" });
    await expect(page.getByText(SELF_RELEASED_TOAST)).toBeVisible();
    await expect(page.getByText("Status da Avaliação")).toBeVisible();
    await expect(page.getByRole("button", { name: "Alterar" })).toBeVisible();

    // O que vale é o que o servidor gravou, não o estado da tela
    await page.reload();
    await expect(page.getByRole("button", { name: "Autoavaliação Liberada" })).toBeVisible();
});

test("[E2E][US12][QA] Com a API respondendo 500, a tela não confirma a liberação e informa o erro", async ({ page }) => {
    await page.route(RELEASE_ROUTE, (route) =>
        route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Erro interno" }) }),
    );

    const response = await releaseSelfEvaluation(page);

    expect(response.status()).toBe(500);
    await expect(page.getByText(SELF_RELEASED_TOAST)).toHaveCount(0);
    await expect(page.getByText("Status da Avaliação")).toHaveCount(0);
    await expect(page.getByText(/não foi possível|falha|erro/i).first()).toBeVisible();

    // Nada foi gravado: depois de recarregar, continua sem liberação
    await page.unroute(RELEASE_ROUTE);
    await page.reload();
    await expect(page.getByRole("button", { name: "Liberar Avaliações", exact: true })).toBeVisible();
});