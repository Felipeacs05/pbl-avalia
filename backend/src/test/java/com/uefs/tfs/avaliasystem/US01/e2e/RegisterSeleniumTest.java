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
@DisplayName("US01 - Testes E2E com Selenium (Cadastro e Upload)")
class RegisterSeleniumTest {

    private WebDriver driver;
    private RegisterPage registerPage;
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
        registerPage = new RegisterPage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("Cenário Válido: Upload de foto com loading visual e cadastro concluído")
    void shouldDisplayVisualLoadingDuringUploadAndCompleteRegistration() throws IOException {
        // 1. Criação de arquivo fake JPG temporário
        Path validPhoto = tempFolder.resolve("perfil_teste.jpg");
        Files.write(validPhoto, new byte[1024 * 50]); // 50 KB

        registerPage.accessUrl(BASE_URL);
        registerPage.fillOutForm("Marina Souza", "marina@uefs.br", "SenhaForte@2026");
        registerPage.attachPhoto(validPhoto.toAbsolutePath().toString());

        registerPage.submit();

        // 2. Validação de UX (Critério 3): O spinner de loading deve aparecer durante o upload
        assertThat(registerPage.waitForLoadingToAppear())
                .as("O componente de loading (spinner/barra) deve estar visível durante o upload")
                .isTrue();

        // 3. O spinner deve desaparecer após o término da requisição
        assertThat(registerPage.waitForLoadingToDisappear())
                .as("O componente de loading deve desaparecer após a conclusão")
                .isTrue();

        // 4. Mensagem de sucesso deve estar visível
        assertThat(registerPage.isSuccessMessageVisible())
                .as("A mensagem de confirmação de cadastro deve ser exibida ao usuário")
                .isTrue();
    }

    @Test
    @DisplayName("Cenário Inválido: Submissão sem foto deve ser bloqueada na interface")
    void shouldBlockRegistrationWithoutProfilePhoto() {
        registerPage.accessUrl(BASE_URL);
        registerPage.fillOutForm("Marina Souza", "marina@uefs.br", "SenhaForte@2026");

        // Submete sem anexar foto
        registerPage.submit();

        // Validação (Critério 4): UI deve alertar que a foto é obrigatória
        assertThat(registerPage.isMandatoryPhotoErrorVisible())
                .as("A interface deve destacar que a foto de perfil é obrigatória")
                .isTrue();
    }
}