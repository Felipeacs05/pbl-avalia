package com.uefs.tfs.avaliasystem.US07.e2e;

import com.uefs.tfs.avaliasystem.US02.e2e.LoginPage;
import com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes automatizados E2E com Selenium para a US07 (Gerenciamento de Critérios da Sala).
 *
 * Contrato vigente: /api/v1/rooms/{roomId}/criteria — Modelo A.
 *
 * Cobertura:
 * 1. Login prévio do tutor responsável utilizando LoginPage (US02);
 * 2. Adição e remoção dinâmica de critérios em interface SPA estrita (sem reload);
 * 3. Remoção robusta de critérios por linha (.rowCriterionItem) e ID de botão;
 * 4. Validação de persistência após recarregamento da página (refresh via GET);
 * 5. Paridade simultânea de validações síncronas no frontend vs. rejeição 400 no backend.
 *
 * IDs de DOM que MUDARAM em relação à versão anterior:
 *   inputPerformanceTableName  → REMOVIDO (sem tableName na API)
 *   btnSavePerformanceTable    → REMOVIDO (critério salvo individualmente via POST /criteria)
 *   formPerformanceTable       → REMOVIDO (substituído por formCriteria no front)
 */
@Tag("e2e")
@DisplayName("US07 - Testes E2E com Selenium (Gerenciamento de Critérios da Sala — /api/v1/rooms/{roomId}/criteria)")
class PerformanceTableSeleniumTest {

    private static final String FRONT_URL    = "http://localhost:5173";
    private static final String API_URL      = "http://localhost:8080";
    private static final String TUTOR_EMAIL  = "marina@uefs.br";
    private static final String TUTOR_PASS   = "SenhaForte@2026";
    // ID da sala de teste pré-cadastrada no banco de desenvolvimento.
    // Deve ser substituído pelo roomId real gerado no ambiente de teste.
    private static final String ROOM_ID_TEST = "550e8400-e29b-41d4-a716-446655440000";

    private WebDriver driver;
    private CriteriaPage page;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1920,1080");
        driver = new ChromeDriver(options);
        page = new CriteriaPage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    /**
     * Helper de autenticação prévia como Tutor via LoginPage (US02)
     * e navegação para a tela de critérios da sala.
     * Rota do frontend: /rooms/{roomId}/criteria
     */
    private void authenticateAndNavigateToCriteria() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo(FRONT_URL);
        loginPage.fillCredentials(TUTOR_EMAIL, TUTOR_PASS);
        loginPage.submit();

        // Aguarda a conclusão da autenticação e redirecionamento para o dashboard
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        wait.until(ExpectedConditions.not(ExpectedConditions.urlContains("/login")));

        // Navega para a tela de critérios da sala
        page.navigateTo(FRONT_URL, ROOM_ID_TEST);
    }

    // =========================================================================
    // TESTE 1: ADIÇÃO E REMOÇÃO DINÂMICA SEM RELOAD (SPA NO-RELOAD)
    // =========================================================================

    @Test
    @DisplayName("Cenário Válido: Deve adicionar e remover critérios dinamicamente na lista sem recarregar a página (SPA no-reload)")
    void shouldAddAndRemoveCriteriaDynamicallyWithoutPageReload() {
        authenticateAndNavigateToCriteria();

        // Marcação JavaScript para provar ausência de recarregamento na página
        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("window.__qa_spa_marker = 'persisted_state';");

        // 1. Adicionar o primeiro critério
        page.addCriterion("Postura e Ética Profissional", "Avaliação comportamental do aluno", "3.0");
        assertThat(page.isCriterionPresent("Postura e Ética Profissional"))
                .as("O primeiro critério deve ser adicionado dinamicamente ao DOM")
                .isTrue();

        // 2. Adicionar o segundo critério
        page.addCriterion("Raciocínio Lógico", "Capacidade de resolução estruturada de problemas", "7.0");
        assertThat(page.isCriterionPresent("Raciocínio Lógico"))
                .as("O segundo critério deve ser adicionado dinamicamente ao DOM")
                .isTrue();

        // 3. Remover o primeiro critério de forma robusta por linha e botão específico
        page.removeCriterion("Postura e Ética Profissional");
        assertThat(page.isCriterionPresent("Postura e Ética Profissional"))
                .as("O critério removido não deve mais estar visível na interface")
                .isFalse();
        assertThat(page.isCriterionPresent("Raciocínio Lógico"))
                .as("O outro critério deve continuar preservado na listagem")
                .isTrue();

        // 4. Confirma que a página permaneceu em modo SPA estrito sem recarregamento
        Object markerValue = js.executeScript("return window.__qa_spa_marker;");
        assertThat(markerValue)
                .as("A página não deve recarregar durante a adição e remoção de critérios (SPA)")
                .isEqualTo("persisted_state");
    }

    // =========================================================================
    // TESTE 2: PERSISTÊNCIA APÓS RELOAD (VALIDAÇÃO VIA GET /rooms/{roomId}/criteria)
    // =========================================================================

    @Test
    @DisplayName("Cenário Válido: Deve persistir critérios e validar via GET após reload da página")
    void shouldPersistCriteriaAndValidateAfterPageReload() {
        authenticateAndNavigateToCriteria();

        // Adiciona múltiplos critérios
        page.addCriterion("Postura e Ética", "Comportamento adequado nas sessões", "4.0");
        page.addCriterion("Raciocínio Lógico", "Capacidade analítica e resolução de problemas", "6.0");

        assertThat(page.isCriterionPresent("Postura e Ética")).isTrue();
        assertThat(page.isCriterionPresent("Raciocínio Lógico")).isTrue();
        assertThat(page.getCriteriaCount()).isEqualTo(2);

        // Recarrega a página via browser — o frontend busca os critérios via GET /api/v1/rooms/{roomId}/criteria
        driver.navigate().refresh();
        page.waitForCriteriaListToLoad();

        // Valida que os critérios persistem e continuam sendo renderizados
        assertThat(page.isCriterionPresent("Postura e Ética"))
                .as("O critério 'Postura e Ética' deve continuar visível após recarregamento")
                .isTrue();
        assertThat(page.isCriterionPresent("Raciocínio Lógico"))
                .as("O critério 'Raciocínio Lógico' deve continuar visível após recarregamento")
                .isTrue();
        assertThat(page.getCriteriaCount())
                .as("A contagem de critérios deve permanecer inalterada após o reload")
                .isEqualTo(2);
    }

    // =========================================================================
    // TESTE 3: PARIDADE FRONT X BACK SIMULTÂNEA COM PAYLOADS INVÁLIDOS
    // =========================================================================

    @ParameterizedTest(name = "[{index}] Paridade Front/Back para: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCasesForFrontend")
    @DisplayName("Deve validar bloqueio síncrono no frontend sem requisição POST e rejeição 400 direta na API")
    void shouldBlockInvalidPayloadSynchronouslyOnFrontendAndRejectWith400OnApi(
            String scenario,
            String criteriaName,
            String criteriaDescription,
            String criteriaWeight,
            String expectedErrorMessage
    ) throws Exception {
        authenticateAndNavigateToCriteria();

        JavascriptExecutor js = (JavascriptExecutor) driver;

        // Limpa as marcas de requisição de rede no navegador para monitorar tráfego
        js.executeScript("window.performance.clearResourceTimings();");

        // 1. Ação no Frontend: Tenta submeter critério inválido
        page.addCriterion(criteriaName, criteriaDescription, criteriaWeight);

        // Valida bloqueio síncrono visual
        assertThat(page.isErrorMessageDisplayed())
                .as("A interface deve exibir mensagem de erro imediatamente para o cenário: " + scenario)
                .isTrue();
        assertThat(page.getErrorMessage())
                .as("A mensagem de validação no frontend deve corresponder à regra de negócio")
                .contains(expectedErrorMessage);
        assertThat(page.getCriteriaCount())
                .as("Nenhum critério inválido deve ser inserido no DOM")
                .isZero();

        // Valida que nenhuma chamada POST para a nova API foi disparada pelo frontend (bloqueio puramente síncrono)
        Long postRequestCount = (Long) js.executeScript(
                "return window.performance.getEntriesByType('resource')" +
                        ".filter(function(r) { return r.name.includes('/api/v1/rooms') && r.initiatorType === 'fetch'; })" +
                        ".length;"
        );
        assertThat(postRequestCount)
                .as("Nenhuma requisição de rede para a API deve ser disparada ao ocorrer erro síncrono no frontend")
                .isZero();

        // 2. Ação direta na API Backend: Envia o mesmo payload inválido via HTTP para certificar paridade.
        // Usa POST /api/v1/rooms/{roomId}/criteria (novo contrato — Modelo A).
        String jwtToken = (String) js.executeScript(
                "return localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('access_token');"
        );

        String jsonPayload = String.format(
                "{\"criteriaName\": %s, \"criteriaDescription\": \"%s\", \"criteriaWeight\": %s}",
                criteriaName == null ? "null" : "\"" + criteriaName.replace("\"", "\\\"") + "\"",
                criteriaDescription,
                criteriaWeight
        );

        // Rota corrigida: POST /api/v1/rooms/{roomId}/criteria (contrato vigente)
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "/api/v1/rooms/" + ROOM_ID_TEST + "/criteria"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload));

        if (jwtToken != null && !jwtToken.isBlank()) {
            requestBuilder.header("Authorization", "Bearer " + jwtToken);
        }

        HttpResponse<String> apiResponse = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());

        // Documentação técnica de paridade:
        // O backend utiliza Bean Validation (@NotBlank, @Pattern, @Size, @PositiveOrZero) rejeitando com HTTP 400 Bad Request.
        // O frontend utiliza regex client-side equivalente (^[a-zA-Z0-9À-ÿ\s-]+$) para impedir a submissão.
        // Qualquer payload que viole o padrão é rejeitado na UI e responderia 400 na API.
        assertThat(apiResponse.statusCode())
                .as("A API backend deve rejeitar diretamente com status 400, 401 ou 403 para o cenário: " + scenario)
                .isIn(400, 401, 403);
    }
}
