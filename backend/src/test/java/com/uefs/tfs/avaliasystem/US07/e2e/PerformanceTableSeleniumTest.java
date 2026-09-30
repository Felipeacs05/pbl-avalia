package com.uefs.tfs.avaliasystem.US07.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes automatizados E2E com Selenium para a US07 (CRUD de Tabelas de Desempenho e Critérios).
 * Valida a adição e remoção dinâmica de critérios (SPA sem reload da página)
 * e o bloqueio síncrono de entradas inválidas no frontend.
 */
@Tag("e2e")
@DisplayName("US07 - Testes E2E com Selenium (CRUD de Tabelas de Desempenho e Critérios)")
class PerformanceTableSeleniumTest {

    private static final String FRONT_URL = "http://localhost:5173";
    private static final String REQUIRED_NAME_ERROR = "O nome do critério é obrigatório.";
    private static final String INVALID_CHARACTERS_ERROR = "O nome do critério contém caracteres inválidos. Utilize apenas letras, números e hifens.";

    private WebDriver driver;
    private PerformanceTablePage page;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1920,1080");
        driver = new ChromeDriver(options);
        page = new PerformanceTablePage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("Deve adicionar e remover critérios dinamicamente na lista sem recarregar a página (SPA no-reload)")
    void shouldAddAndRemoveCriteriaDynamicallyWithoutPageReload() {
        page.navigateTo(FRONT_URL);
        page.fillTableName("Tabela Semestral de Tutoria PBL");

        // Marcação para verificar se a página realizou reload indevido
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

        // 3. Remover o primeiro critério
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

    @Test
    @DisplayName("Deve bloquear síncronamente a tentativa de inserir critério com nome vazio")
    void shouldBlockAddingCriterionWhenNameIsEmptySynchronously() {
        page.navigateTo(FRONT_URL);

        // Tenta adicionar com nome vazio
        page.addCriterion("", "Descrição válida", "2.0");

        assertThat(page.isErrorMessageDisplayed())
                .as("A mensagem de erro deve ser exibida imediatamente na tela")
                .isTrue();
        assertThat(page.getErrorMessage())
                .as("A mensagem de validação deve corresponder à regra de campo obrigatório")
                .contains(REQUIRED_NAME_ERROR);
        assertThat(page.getCriteriaCount())
                .as("Nenhum critério inválido deve ser inserido na listagem")
                .isZero();
    }

    @Test
    @DisplayName("Deve bloquear síncronamente a tentativa de inserir critérios com caracteres especiais não permitidos")
    void shouldBlockAddingCriterionWithDisallowedSpecialCharacters() {
        page.navigateTo(FRONT_URL);

        // Inserção com tags script / caracteres especiais
        page.addCriterion("<script>alert('XSS')</script> *#;", "Tentativa de injeção", "1.0");

        assertThat(page.isErrorMessageDisplayed())
                .as("A validação síncrona deve alertar sobre caracteres especiais proibidos")
                .isTrue();
        assertThat(page.getErrorMessage())
                .as("A mensagem de erro deve orientar o usuário sobre os caracteres aceitos")
                .contains(INVALID_CHARACTERS_ERROR);
        assertThat(page.getCriteriaCount())
                .as("Nenhum item com script deve ser injetado no DOM")
                .isZero();
    }
}
