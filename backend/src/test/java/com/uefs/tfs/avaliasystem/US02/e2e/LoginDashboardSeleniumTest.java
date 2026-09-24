package com.uefs.tfs.avaliasystem.US02.e2e;

import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testes End-to-End (E2E) com Selenium WebDriver para US02.
 * Cobertura de Critérios de Aceite:
 *  - CA2 (Privacidade): Erro genérico "Credenciais inválidas" na UI.
 *  - CA3 (UX/Interface): Visualização e alternância das abas "Salas que administro (Tutor)" e "Salas que participo (Aluno)".
 */
@Tag("e2e")
@DisplayName("US02 - Testes E2E com Selenium (Login e Dashboard de Salas)")
class LoginDashboardSeleniumTest {

    private WebDriver driver;
    private LoginPage loginPage;
    private DashboardPage dashboardPage;
    private static final String BASE_URL = "http://localhost:5173";

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");

        driver = new ChromeDriver(options);
        loginPage = new LoginPage(driver);
        dashboardPage = new DashboardPage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("Cenário Válido: Login correto redireciona ao Dashboard com abas de Tutor e Aluno separadas visualmente")
    void deveAutenticarComSucessoEExibirAbasSeparadasNoDashboard() {
        loginPage.acessar(BASE_URL);
        loginPage.preencherCredenciais("marina@uefs.br", "SenhaForte@2026");
        loginPage.submeter();

        // 1. Aguarda redirecionamento para o dashboard
        assertThat(dashboardPage.aguardarCarregamento())
                .as("O usuário deve ser redirecionado para o dashboard pós-login")
                .isTrue();

        // 2. Valida Critério 3 (UX): As abas de Tutor e Aluno devem existir e estar visíveis
        assertThat(dashboardPage.isAbaTutorVisivel())
                .as("A aba 'Salas que administro (Tutor)' deve estar visível")
                .isTrue();

        assertThat(dashboardPage.isAbaAlunoVisivel())
                .as("A aba 'Salas que participo (Aluno)' deve estar visível")
                .isTrue();

        // 3. Testa alternância para aba Tutor
        dashboardPage.selecionarAbaTutor();
        assertThat(dashboardPage.isSecaoSalasTutorExibida())
                .as("A seção de salas de Tutor deve estar visível ao selecionar a aba Tutor")
                .isTrue();

        // 4. Testa alternância para aba Aluno
        dashboardPage.selecionarAbaAluno();
        assertThat(dashboardPage.isSecaoSalasAlunoExibida())
                .as("A seção de salas de Aluno deve estar visível ao selecionar a aba Aluno")
                .isTrue();
    }

    @Test
    @DisplayName("Cenário Inválido 1: Senha incorreta exibe alerta genérico 'Credenciais inválidas'")
    void deveExibirMensagemGenericaParaSenhaIncorreta() {
        loginPage.acessar(BASE_URL);
        loginPage.preencherCredenciais("marina@uefs.br", "senhaErrada123");
        loginPage.submeter();

        assertThat(loginPage.isAlertaErroVisivel())
                .as("O alerta de erro deve ser exibido")
                .isTrue();

        assertThat(loginPage.obterMensagemErro())
                .as("A mensagem exibida deve ser genérica: 'Credenciais inválidas'")
                .isEqualTo("Credenciais inválidas");

        assertThat(driver.getCurrentUrl())
                .as("O usuário não deve ser direcionado para o dashboard")
                .doesNotContain("/dashboard");
    }

    @Test
    @DisplayName("Cenário Inválido 2: E-mail inexistente exibe a mesma mensagem genérica sem revelar dados")
    void deveExibirMesmaMensagemGenericaParaEmailInexistente() {
        loginPage.acessar(BASE_URL);
        loginPage.preencherCredenciais("naoexiste@uefs.br", "qualquerSenha");
        loginPage.submeter();

        assertThat(loginPage.isAlertaErroVisivel())
                .as("O alerta de erro deve ser exibido")
                .isTrue();

        assertThat(loginPage.obterMensagemErro())
                .as("A mensagem exibida deve ser estritamente genérica")
                .isEqualTo("Credenciais inválidas");

        assertThat(driver.getCurrentUrl())
                .as("O usuário não deve ser direcionado para o dashboard")
                .doesNotContain("/dashboard");
    }
}
