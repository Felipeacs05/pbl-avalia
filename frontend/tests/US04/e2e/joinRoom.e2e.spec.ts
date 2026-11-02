import { expect, test, type Page } from "@playwright/test";

const VALID_CODE = "TEC499";
const WRONG_CODE = "ZZZ99";
const MAX_FAILED_ATTEMPTS = 5;

const WRONG_CODE_TITLE = /^código errado$/i;
const BLOCKED_TITLE = /^muitas tentativas$/i;
const BLOCKED_MESSAGE = /cerca de 15 min/i;

// O bloqueio do mock vive na memória da página: cada page.goto zera o contador, então não há limpeza a fazer

function codeInput(page: Page) {
    // O campo não tem <label>
    return page.getByPlaceholder("Código da sala");
}

function confirmButton(page: Page) {
    return page.getByRole("button", { name: /entrar em sala pbl/i });
}

async function submitCode(page: Page, code: string) {
    await codeInput(page).fill(code);
    await confirmButton(page).click();
}

// A primeira tentativa abre o modal pelo botão do rodapé; as seguintes usam "Tentar de novo"
async function failOnce(page: Page, firstAttempt: boolean) {
    if (firstAttempt) {
        await page.getByRole("button", { name: /^entrar em sala$/i }).click();
    } else {
        await page.getByRole("button", { name: /tentar de novo/i }).click();
    }
    await submitCode(page, WRONG_CODE);
    await expect(page.getByRole("heading", { name: WRONG_CODE_TITLE })).toBeVisible();
}

async function failTimes(page: Page, times: number) {
    for (let i = 0; i < times; i++) await failOnce(page, i === 0);
}

test("[E2E][US04] Aluno abre o link de convite, o código já vem preenchido e ele entra na sala", async ({ page }) => {
    await page.goto(`/student-rooms?codigo=${VALID_CODE}`);

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(codeInput(page)).toHaveValue(VALID_CODE);

    await confirmButton(page).click();

    await expect(page).toHaveURL(/\/student-rooms\/1$/);
});

test("[E2E][US04] Código errado mostra o pop-up com o código digitado e permite tentar de novo", async ({ page }) => {
    await page.goto("/student-rooms");

    await failOnce(page, true);
    await expect(page.getByText(`“${WRONG_CODE}”`)).toBeVisible();

    await page.getByRole("button", { name: /tentar de novo/i }).click();
    await expect(codeInput(page)).toHaveValue("");
    await submitCode(page, VALID_CODE);

    await expect(page).toHaveURL(/\/student-rooms\/1$/);
});

test("[E2E][US04][QA] Brute-force: 5 códigos errados e a tentativa seguinte mostra o aviso de bloqueio", async ({ page }) => {
    await page.goto("/student-rooms");

    await failTimes(page, MAX_FAILED_ATTEMPTS);

    // A 6ª tentativa é a que recebe o 429
    await page.getByRole("button", { name: /tentar de novo/i }).click();
    await submitCode(page, WRONG_CODE);

    await expect(page.getByRole("heading", { name: BLOCKED_TITLE })).toBeVisible();
    await expect(page.getByText(BLOCKED_MESSAGE)).toBeVisible();
    await expect(page.getByRole("button", { name: "Entendi" })).toBeVisible();
    await expect(page.getByRole("button", { name: /tentar de novo/i })).toHaveCount(0);
});

test("[E2E][US04][QA] Depois do bloqueio, nem o código válido entra na sala", async ({ page }) => {
    await page.goto("/student-rooms");
    await failTimes(page, MAX_FAILED_ATTEMPTS);
    await page.getByRole("button", { name: /tentar de novo/i }).click();
    await submitCode(page, WRONG_CODE);
    await expect(page.getByRole("heading", { name: BLOCKED_TITLE })).toBeVisible();
    await page.getByRole("button", { name: "Entendi" }).click();

    await page.getByRole("button", { name: /^entrar em sala$/i }).click();
    await submitCode(page, VALID_CODE);

    await expect(page.getByRole("heading", { name: BLOCKED_TITLE })).toBeVisible();
    await expect(page).toHaveURL(/\/student-rooms$/);
});

test("[E2E][US04][QA] O link copiado pela US03 (app/join/{codigo}) abre o ingresso com o código preenchido", async ({ page }) => {
    await page.goto(`/app/join/${VALID_CODE}`);

    // A US04 pede entrar pelo link sem digitar o código
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(codeInput(page)).toHaveValue(VALID_CODE);
});