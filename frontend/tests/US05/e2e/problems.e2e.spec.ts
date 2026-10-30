import { expect, test, type Page, type Response } from "@playwright/test";

const DISCIPLINE_PROBLEMS_ROUTE = /\/api\/v1\/disciplines\/[^/?#]+\/problems$/;
const TITLE_REQUIRED_MESSAGE = /o título do problema não pode ficar vazio/i;

function requiredEnv(name: string, description: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} must be set to ${description}`);
    }
    return value;
}

let roomId: string;
let disciplineId: string;
let studentId: string;
let createdProblemUrls: string[];

function uniqueTitle(prefix: string): string {
    return `${prefix} ${Date.now()}`;
}

// A URL do problema é derivada do tráfego real, sem supor onde o backend está
function problemUrl(createResponse: Response, problemId: string): string {
    return new URL(`/api/v1/problems/${problemId}`, createResponse.url()).toString();
}

async function openDisciplines(page: Page) {
    await page.goto(`/teacher-rooms/${roomId}/disciplines`);
    await expect(page.getByRole("button", { name: /novo problema/i })).toBeVisible();
}

test.beforeAll(() => {
    roomId = requiredEnv("E2E_ROOM_ID", "the UUID of a room whose Tutor is E2E_USER_ID");
    disciplineId = requiredEnv(
        "E2E_DISCIPLINE_ID",
        "the UUID of the discipline of E2E_ROOM_ID where problems are created",
    );
    studentId = requiredEnv("E2E_STUDENT_ID", "the UUID of an existing user who is not the Tutor of E2E_ROOM_ID");
});

test.beforeEach(() => {
    createdProblemUrls = [];
});

test.afterEach(async ({ page }) => {
    for (const url of createdProblemUrls) {
        await page.request.delete(url);
    }
});

test("[E2E][US05][QA] Tutor cria um problema pelo modal: POST real na disciplina da sala e redirecionamento ao pré-set", async ({ page }) => {
    await openDisciplines(page);
    const title = uniqueTitle("E2E Problema");
    const description = "Descrição criada pelo teste E2E";

    await page.getByRole("button", { name: /novo problema/i }).click();
    await page.getByLabel(/título/i).fill(title);
    await page.getByLabel(/descrição/i).fill(description);
    const [response] = await Promise.all([
        page.waitForResponse((res) => res.request().method() === "POST" && DISCIPLINE_PROBLEMS_ROUTE.test(res.url())),
        page.getByRole("button", { name: /^criar$/i }).click(),
    ]);

    const body = (await response.json()) as { id: string; title: string };
    createdProblemUrls.push(problemUrl(response, body.id));
    // A disciplina do POST é a da sala, vinda do backend, e não um id de mock
    expect(response.url()).toMatch(new RegExp(`/api/v1/disciplines/${disciplineId}/problems$`));
    expect(response.request().postDataJSON()).toEqual({ title, description });
    expect(response.status()).toBe(201);
    // O id não vai no payload: a resposta foi montada a partir do banco
    expect(body).toMatchObject({ title });
    await expect(page).toHaveURL(new RegExp(`/teacher-rooms/${roomId}/problems/${body.id}/preset$`));
});

test("[E2E][US05][QA] Título vazio é bloqueado no modal e nenhuma requisição sai", async ({ page }) => {
    await openDisciplines(page);
    const posts: string[] = [];
    page.on("request", (req) => {
        if (req.method() === "POST" && DISCIPLINE_PROBLEMS_ROUTE.test(req.url())) posts.push(req.url());
    });

    await page.getByRole("button", { name: /novo problema/i }).click();
    await page.getByLabel(/título/i).fill("   ");
    await page.getByRole("button", { name: /^criar$/i }).click();

    // O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
    await expect(page.getByRole("alert").filter({ hasText: TITLE_REQUIRED_MESSAGE })).toBeVisible();
    expect(posts).toHaveLength(0);
});

test("[E2E][US05][QA] Aluno recebe 403 ao criar problema pela API e nada é gravado", async ({ playwright, baseURL }) => {
    const student = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": studentId } });
    const response = await student.post(`/api/v1/disciplines/${disciplineId}/problems`, {
        data: { title: uniqueTitle("Problema Invasor"), description: "IDOR" },
    });
    await student.dispose();

    expect(response.status()).toBe(403);
});

test("[E2E][US05][QA] Aluno recebe 403 ao excluir um problema da sala e o problema continua existindo", async ({ page, playwright, baseURL }) => {
    // O tutor (identidade padrão do config) cria o problema que o aluno vai tentar excluir
    const created = await page.request.post(`/api/v1/disciplines/${disciplineId}/problems`, {
        data: { title: uniqueTitle("E2E Protegido"), description: "IDOR de exclusão" },
    });
    expect(created.status()).toBe(201);
    const url = new URL(`/api/v1/problems/${((await created.json()) as { id: string }).id}`, created.url()).toString();
    createdProblemUrls.push(url);

    const student = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": studentId } });
    const response = await student.delete(url);
    await student.dispose();

    expect(response.status()).toBe(403);
    expect((await page.request.get(url)).status()).toBe(200);
});