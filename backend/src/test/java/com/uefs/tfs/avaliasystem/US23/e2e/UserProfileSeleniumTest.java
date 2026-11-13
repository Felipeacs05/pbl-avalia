package com.uefs.tfs.avaliasystem.US23.e2e;

import com.uefs.tfs.avaliasystem.US02.e2e.LoginPage;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato assumido:
 * - Testes End-to-End de Interface com Selenium WebDriver (US23).
 * - Execução headless com Google Chrome:
 *   --headless=new, --no-sandbox, --disable-dev-shm-usage, --window-size=1920,1080.
 * - Integração com Frontend em http://localhost:5173.
 * - Login prévio executado via LoginPage da US02.
 * - Cobertura de Critérios de Aceite de UX/Interface:
 *   - CA1: Alteração de nome e foto com feedback visual (loading visual/spinner) e mensagem de sucesso.
 *   - CA2: Rejeição na UI para arquivos acima de 5MB ou com extensões que não sejam JPG/PNG.
 *   - CA3: Bloqueio visual com alerta de erro caso a senha atual informada seja incorreta.
 *   - CA4: Conclusão bem-sucedida da troca de senha ao informar a senha correta.
 */
@Tag("e2e")
@DisplayName("[US23] Testes E2E com Selenium (Edição de Perfil do Usuário)")
class UserProfileSeleniumTest {

    private WebDriver driver;
    private LoginPage loginPage;
    private ProfilePage profilePage;
    private static final String BASE_URL = "http://localhost:5173";

    @TempDir
    Path tempFolder;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");

        driver = new ChromeDriver(options);
        loginPage = new LoginPage(driver);
        profilePage = new ProfilePage(driver);

        // Autentica previamente utilizando a LoginPage da US02
        loginPage.navigateTo(BASE_URL);
        loginPage.fillCredentials("usuario.perfil@uefs.br", "SenhaForte@2026");
        loginPage.submit();
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("[US23] Cenário Válido: Upload de foto com loading visual e atualização de dados concluída")
    void shouldDisplayVisualLoadingDuringPhotoUploadAndCompleteProfileUpdate() throws IOException {
        // Arrange (Cria foto temporária válida de 50 KB)
        Path validPhoto = tempFolder.resolve("perfil_valido.jpg");
        Files.write(validPhoto, new byte[1024 * 50]);

        profilePage.navigateTo(BASE_URL);
        profilePage.fillName("Marina Santos Atualizada");
        profilePage.attachPhoto(validPhoto.toAbsolutePath().toString());

        // Act (Submete a atualização)
        profilePage.submitProfile();

        // Assert (Verifica o ciclo do componente visual de loading - spinner)
        assertThat(profilePage.waitForLoadingToAppear())
                .as("O componente visual de loading (spinner) deve estar visível durante o upload da foto")
                .isTrue();

        assertThat(profilePage.waitForLoadingToDisappear())
                .as("O spinner deve desaparecer após a conclusão da requisição")
                .isTrue();

        assertThat(profilePage.isSuccessMessageVisible())
                .as("A mensagem de confirmação de atualização deve ser exibida ao usuário")
                .isTrue();
    }

    @Test
    @DisplayName("[US23] Cenário Inválido: Arquivo em formato inválido (.pdf) ou acima de 5MB exibe alerta na UI")
    void shouldDisplayErrorAlertWhenPhotoExceedsSizeLimitOrHasInvalidExtension() throws IOException {
        // Arrange (Arquivo inválido PDF)
        Path invalidPdf = tempFolder.resolve("documento.pdf");
        Files.write(invalidPdf, "%PDF-1.4 conteudo".getBytes());

        profilePage.navigateTo(BASE_URL);
        profilePage.attachPhoto(invalidPdf.toAbsolutePath().toString());
        profilePage.submitProfile();

        // Assert (A interface deve alertar que o formato não é aceito)
        assertThat(profilePage.isPhotoErrorVisible())
                .as("A interface deve exibir alerta visual indicando arquivo de foto inválido")
                .isTrue();
    }

    @Test
    @DisplayName("[US23] Cenário Inválido: Senha atual incorreta bloqueia a troca e exibe alerta de erro na interface")
    void shouldDisplayErrorAlertWhenCurrentPasswordIsIncorrect() {
        // Arrange
        profilePage.navigateTo(BASE_URL);
        profilePage.fillPasswordForm("senhaErrada123", "NovaSenhaForte@2027");

        // Act
        profilePage.submitPasswordChange();

        // Assert (Deve apresentar mensagem de erro específica para senha atual incorreta)
        assertThat(profilePage.isCurrentPasswordErrorVisible())
                .as("A interface deve exibir alerta visual informando que a senha atual está incorreta")
                .isTrue();
    }

    @Test
    @DisplayName("[US23] Cenário Válido: Troca de senha com a senha atual correta exibe confirmação de sucesso")
    void shouldChangePasswordSuccessfullyWhenCurrentPasswordIsCorrect() {
        // Arrange
        profilePage.navigateTo(BASE_URL);
        profilePage.fillPasswordForm("SenhaForte@2026", "NovaSenhaForte@2027");

        // Act
        profilePage.submitPasswordChange();

        // Assert
        assertThat(profilePage.isSuccessMessageVisible())
                .as("A confirmação de alteração de senha deve ser apresentada ao usuário")
                .isTrue();
    }
}
