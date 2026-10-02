import { expect, test, type Page } from "@playwright/test";
import {
  CRITERIA_REQUIRED_MESSAGE,
  CRITERIA_INVALID_CHARACTERS_MESSAGE,
  PERFORMANCE_TABLES_ROUTE,
  CRITERIA_ROUTE,
  makePerformanceTable,
} from "../fixtures";

/**
 * Testes End-to-End (E2E) para a US07 — CRUD de Tabelas de Desempenho e Critérios.
 * Valida os requisitos de interface dinâmica (SPA no-reload) e validações síncronas/assíncronas.
 */

function generateCriterionName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

async function navigateToPerformanceTableForm(page: Page) {
  // Navega até a rota de criação ou edição da tabela de desempenho
  await page.goto("/performance-tables/new");
  await expect(page.locator("#formPerformanceTable")).toBeVisible();
}

test.describe("[US07] CRUD de Tabelas de Desempenho e Critérios", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPerformanceTableForm(page);
  });

  test("[Happy Path][SPA] Deve adicionar e remover critérios dinamicamente sem recarregar a página", async ({
    page,
  }) => {
    const criterionName1 = generateCriterionName("Critério Postura");
    const criterionName2 = generateCriterionName("Critério Raciocínio Lógico");

    // Monitora eventos de navegação/reload para garantir que a aplicação se comporte estritamente como SPA (no-reload)
    let pageReloaded = false;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame() && frame.url() !== "about:blank") {
        // Se disparar navegação após o carregamento inicial, marca reload indevido
        pageReloaded = true;
      }
    });

    // 1. Preenche o nome da tabela
    await page.locator("#inputPerformanceTableName").fill("Tabela de Avaliação PBL");

    // 2. Adiciona o primeiro critério dinamicamente
    await page.locator("#inputCriterionName").fill(criterionName1);
    await page.locator("#inputCriterionDescription").fill("Avaliação da postura nas reuniões tutorais");
    await page.locator("#inputCriterionWeight").fill("4.0");
    await page.locator("#btnAddCriterion").click();

    // Validação no DOM: O critério deve aparecer na lista e o input deve ser resetado
    const item1 = page.locator("#tableCriteriaList").filter({ hasText: criterionName1 });
    await expect(item1).toBeVisible();
    await expect(page.locator("#inputCriterionName")).toHaveValue("");

    // 3. Adiciona o segundo critério dinamicamente
    await page.locator("#inputCriterionName").fill(criterionName2);
    await page.locator("#inputCriterionDescription").fill("Capacidade analítica e resolução de problemas");
    await page.locator("#inputCriterionWeight").fill("6.0");
    await page.locator("#btnAddCriterion").click();

    const item2 = page.locator("#tableCriteriaList").filter({ hasText: criterionName2 });
    await expect(item2).toBeVisible();

    // 4. Remove o primeiro critério dinamicamente
    await item1.locator("button[id^='btnRemoveCriterion_']").click();

    // Validação no DOM: item1 deve sumir, item2 deve continuar existindo
    await expect(item1).toHaveCount(0);
    await expect(item2).toBeVisible();

    // 5. Assegura que nenhum recarregamento de página ocorreu durante as manipulações
    expect(pageReloaded).toBe(false);
  });

  test("[Unhappy Path][Frontend] Deve bloquear síncronamente a adição de critério com criteriaName vazio", async ({
    page,
  }) => {
    // Garante que o campo de nome do critério está vazio
    await page.locator("#inputCriterionName").fill("");

    // Monitora requisições de rede para garantir que nenhuma chamada seja feita
    let networkRequestTriggered = false;
    page.on("request", (req) => {
      if (CRITERIA_ROUTE.test(req.url()) || PERFORMANCE_TABLES_ROUTE.test(req.url())) {
        networkRequestTriggered = true;
      }
    });

    // Tenta clicar no botão de adicionar critério
    await page.locator("#btnAddCriterion").click();

    // Valida que o bloqueio ocorreu síncronamente no client-side
    expect(networkRequestTriggered).toBe(false);

    // Valida que a mensagem de erro esperada é exibida na interface
    const errorContainer = page.locator("#feedbackErrorCriteriaName");
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toHaveText(CRITERIA_REQUIRED_MESSAGE);

    // Valida que nada foi inserido na listagem visual
    await expect(page.locator("#tableCriteriaList").locator(".rowCriterionItem")).toHaveCount(0);
  });

  test("[Unhappy Path][Frontend] Deve bloquear síncronamente a inserção de caracteres especiais não permitidos", async ({
    page,
  }) => {
    const invalidInput = "<script>alert('XSS')</script> *#;";

    await page.locator("#inputCriterionName").fill(invalidInput);
    await page.locator("#btnAddCriterion").click();

    // Valida exibição de erro no frontend
    const errorContainer = page.locator("#feedbackErrorCriteriaName");
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toHaveText(CRITERIA_INVALID_CHARACTERS_MESSAGE);

    // Garante que nenhum item inválido foi incluído na lista
    await expect(page.locator("#tableCriteriaList").filter({ hasText: invalidInput })).toHaveCount(0);
  });

  test("[API & Frontend Integration] Deve enviar o payload correto ao salvar a tabela com critérios", async ({
    page,
  }) => {
    const tableName = "Tabela Integrada de Desempenho";
    const criterionName = "Comunicação Efetiva";

    await page.locator("#inputPerformanceTableName").fill(tableName);
    await page.locator("#inputCriterionName").fill(criterionName);
    await page.locator("#inputCriterionWeight").fill("5.0");
    await page.locator("#btnAddCriterion").click();

    // Intercepta a requisição POST para validar o contrato JSON em inglês
    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.method() === "POST" && PERFORMANCE_TABLES_ROUTE.test(req.url())
      ),
      page.locator("#btnSavePerformanceTable").click(),
    ]);

    const postData = request.postDataJSON();
    expect(postData).toHaveProperty("tableName", tableName);
    expect(postData).toHaveProperty("criteriaList");
    expect(Array.isArray(postData.criteriaList)).toBe(true);
    expect(postData.criteriaList[0]).toMatchObject({
      criteriaName: criterionName,
      criteriaWeight: 5.0,
    });
  });
});
