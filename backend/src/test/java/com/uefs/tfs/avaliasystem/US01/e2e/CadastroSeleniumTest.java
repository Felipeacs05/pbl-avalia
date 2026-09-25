package com.uefs.tfs.avaliasystem.US01.e2e;

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
 * Testes End-to-End (E2E) com Selenium WebDriver para US01.
 * Cobre:
 *  - Cenário Válido: preenchimento completo + upload de foto JPG/PNG.
 *  - Validação de UX: verificação de exibição e desaparecimento do spinner de loading.
 *  - Cenário Inválido: submissão sem foto bloqueada na UI com mensagem de erro.
 */
@Tag("e2e")
@DisplayName("US01 - E2E Tests with Selenium (Registration and Upload)")
class CadastroSeleniumTest {

    private WebDriver driver;
    private CadastroPage cadastroPage;
    private static final String BASE_URL = "http://localhost:5173";

    @TempDir
    Path tempFolder;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        // Headless para execução rápida e compatibilidade com GitHub Actions
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");

        // Nota: requer ChromeDriver no PATH ou compatível com a versão instalada do Chrome
        driver = new ChromeDriver(options);
        cadastroPage = new CadastroPage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("Valid Scenario: Photo upload with visual loading and successful registration")
    void shouldDisplayVisualLoadingDuringUploadAndCompleteRegistration() throws IOException {
        // 1. Criação de arquivo fake JPG temporário
        Path validPhoto = tempFolder.resolve("perfil_teste.jpg");
        Files.write(validPhoto, new byte[1024 * 50]); // 50 KB

        cadastroPage.acessar(BASE_URL);
        cadastroPage.preencherFormulario("Marina Souza", "marina@uefs.br", "SenhaForte@2026");
        cadastroPage.anexarFoto(validPhoto.toAbsolutePath().toString());

        cadastroPage.submeter();

        // 2. Validação de UX (Critério 3): O spinner de loading deve aparecer durante o upload
        assertThat(cadastroPage.aguardarAparicaoLoading())
                .as("The loading component (spinner/bar) should be visible during upload")
                .isTrue();

        // 3. O spinner deve desaparecer após o término da requisição
        assertThat(cadastroPage.aguardarDesaparecimentoLoading())
                .as("The loading component should disappear after completion")
                .isTrue();

        // 4. Mensagem de sucesso deve estar visível
        assertThat(cadastroPage.isMensagemSucessoVisivel())
                .as("The registration confirmation message should be displayed to the user")
                .isTrue();
    }

    @Test
    @DisplayName("Invalid Scenario 1: Submission without photo should be blocked in the interface")
    void shouldBlockRegistrationWithoutProfilePhoto() {
        cadastroPage.acessar(BASE_URL);
        cadastroPage.preencherFormulario("Marina Souza", "marina@uefs.br", "SenhaForte@2026");

        // Submete sem anexar foto
        cadastroPage.submeter();

        // Validação (Critério 4): UI deve alertar que a foto é obrigatória
        assertThat(cadastroPage.isErroFotoObrigatoriaVisivel())
                .as("The interface should highlight that the profile photo is required")
                .isTrue();
    }
}
