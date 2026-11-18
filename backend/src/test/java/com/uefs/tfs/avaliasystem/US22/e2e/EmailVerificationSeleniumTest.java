package com.uefs.tfs.avaliasystem.US22.e2e;

import com.uefs.tfs.avaliasystem.US02.e2e.LoginPage;
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato assumido:
 * - Testes End-to-End de Interface (UI) com Selenium WebDriver (US22).
 * - Execução headless com Google Chrome:
 *   --headless=new, --no-sandbox, --disable-dev-shm-usage, --window-size=1920,1080.
 * - Integração com Frontend em http://localhost:5173.
 * - Autenticação reutiliza LoginPage da US02.
 * - Cobertura de Critérios de Aceite de UX/Interface:
 *   - CA1: Contas não verificadas exibem aviso visual (aviso-conta-nao-verificada) na tentativa de criar sala ou no dashboard.
 *   - CA2: Link de confirmação com token válido exibe mensagem de sucesso (mensagem-verificacao-sucesso).
 *   - CA3: Link com token inválido/expirado exibe alerta de erro (mensagem-verificacao-erro).
 *   - CA4: Opção de reenvio com feedback visual claro (btn-reenviar-verificacao e mensagem-reenvio-sucesso).
 */
@Tag("e2e")
@DisplayName("[US22] Testes E2E com Selenium (Verificação de E-mail no Cadastro)")
class EmailVerificationSeleniumTest {

    private WebDriver driver;
    private LoginPage loginPage;
    private VerifyEmailPage verifyEmailPage;
    private static final String FRONT_URL = "http://localhost:5173";

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");

        driver = new ChromeDriver(options);
        loginPage = new LoginPage(driver);
        verifyEmailPage = new VerifyEmailPage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("[US22] Deve exibir aviso de conta não verificada ao acessar com usuário pendente de confirmação")
    void shouldDisplayWarningWhenUnverifiedUserAttemptsToAccessRestrictedFeatures() {
        // Arrange & Act
        loginPage.navigateTo(FRONT_URL);
        loginPage.fillCredentials("usuario.pendente@uefs.br", "SenhaForte@2026");
        loginPage.submit();

        // Assert
        assertThat(verifyEmailPage.isUnverifiedAccountWarningVisible())
                .as("O aviso visual de conta não verificada deve estar visível para o usuário")
                .isTrue();
    }

    @Test
    @DisplayName("[US22] Deve exibir mensagem de sucesso ao carregar a página de confirmação com token válido")
    void shouldDisplaySuccessMessageWhenNavigatingWithValidToken() {
        // Act
        verifyEmailPage.navigateToVerification(FRONT_URL, "token-valido-qa-12345");

        // Assert
        assertThat(verifyEmailPage.isSuccessMessageVisible())
                .as("A mensagem de verificação bem-sucedida deve ser exibida na tela")
                .isTrue();
        assertThat(verifyEmailPage.getSuccessMessageText())
                .as("O texto de confirmação deve indicar sucesso na verificação")
                .containsIgnoringCase("verificado com sucesso");
    }

    @Test
    @DisplayName("[US22] Deve exibir mensagem de erro ao carregar a página com token inválido ou expirado")
    void shouldDisplayErrorMessageWhenNavigatingWithInvalidOrExpiredToken() {
        // Act
        verifyEmailPage.navigateToVerification(FRONT_URL, "token-invalido-ou-expirado");

        // Assert
        assertThat(verifyEmailPage.isErrorMessageVisible())
                .as("O alerta de erro deve ser apresentado caso o token seja inválido")
                .isTrue();
    }

    @Test
    @DisplayName("[US22] Deve permitir reenviar e-mail de confirmação e apresentar feedback visual de sucesso")
    void shouldAllowResendingVerificationEmailWithVisualFeedback() {
        // Arrange
        verifyEmailPage.navigateToResend(FRONT_URL);
        verifyEmailPage.fillResendEmail("aluno.reenvio@uefs.br");

        // Act
        verifyEmailPage.clickResendVerification();

        // Assert
        assertThat(verifyEmailPage.isResendSuccessFeedbackVisible())
                .as("A interface deve confirmar visualmente o envio de uma nova mensagem")
                .isTrue();
    }
}
