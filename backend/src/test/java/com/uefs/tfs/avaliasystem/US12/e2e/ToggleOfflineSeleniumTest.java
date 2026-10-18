package com.uefs.tfs.avaliasystem.US12.e2e;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.Map;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * US12 - Toggle de autoavaliação com API offline (E2E com Selenium).
 *
 * Usa o Chrome DevTools Protocol (CDP) para simular a queda de rede
 * DEPOIS que a página já carregou. Funciona apenas em navegadores Chromium.
 *
 * Premissas (ajuste conforme o ambiente):
 *  - Frontend de pé em e2e.baseUrl (padrão: http://localhost:5173).
 *  - Problema semeado com id em e2e.problemId e JWT de Tutor em e2e.tutorToken.
 *  - A chave do token no localStorage é "token".
 *  - O toast de erro menciona erro/falha/conexão.
 */
class ToggleOfflineSeleniumTest {

    private static final String BASE_URL = System.getProperty("e2e.baseUrl", "http://localhost:5173");
    private static final String PROBLEM_ID = System.getProperty("e2e.problemId", "00000000-0000-0000-0000-000000000001");
    private static final String TUTOR_TOKEN = System.getProperty("e2e.tutorToken", "token-de-teste");
    private static final String AUTH_STORAGE_KEY = "token";
    private static final Pattern ERROR_TOAST_PATTERN =
            Pattern.compile(".*(erro|falha|conex[aã]o|tente novamente).*", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final String OPEN_LABEL = "Avaliações Abertas";

    private ChromeDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        // Dado um tutor autenticado na tela do problema
        driver.get(BASE_URL);
        ((JavascriptExecutor) driver).executeScript(
                "window.localStorage.setItem(arguments[0], arguments[1]);", AUTH_STORAGE_KEY, TUTOR_TOKEN);
        driver.get(BASE_URL + "/problems/" + PROBLEM_ID);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("statusAssessmentLabel")));

        // E o domínio Network do DevTools está habilitado
        driver.executeCdpCommand("Network.enable", Map.of());
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    /** Liga/desliga o modo offline do navegador via CDP. */
    private void setOffline(boolean offline) {
        driver.executeCdpCommand("Network.emulateNetworkConditions", Map.<String, Object>of(
                "offline", offline,
                "latency", 0,
                "downloadThroughput", -1,
                "uploadThroughput", -1));
    }

    private WebElement toggle() {
        return driver.findElement(By.id("toggleSelfAssessment_" + PROBLEM_ID));
    }

    private String statusLabelText() {
        return driver.findElement(By.id("statusAssessmentLabel")).getText().trim();
    }

    @Test
    @DisplayName("[US12] toggle_ApiOffline_MantemEstadoAnteriorEExibeErro")
    void toggle_ApiOffline_KeepsPreviousStateAndShowsError() {
        // Dado o estado inicial lido da própria tela e um marcador para detectar recarregamento
        String initialLabelText = statusLabelText();
        ((JavascriptExecutor) driver).executeScript("window.__noReloadMarker = true;");

        // E a rede cai antes do clique
        setOffline(true);

        // Quando o tutor aciona o toggle
        toggle().click();

        // Então o toast de erro é exibido ao usuário
        WebElement toast = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("toastNotification")));
        assertThat(toast.getText())
                .as("O toast de erro deveria ser exibido quando a API está offline")
                .matches(ERROR_TOAST_PATTERN);

        // E o label NÃO muda (sem estado otimista preso na tela)
        assertThat(statusLabelText())
                .as("O status visual deveria permanecer no valor anterior após a falha")
                .isEqualTo(initialLabelText);

        // E o toggle continua utilizável para nova tentativa
        assertThat(toggle().isEnabled())
                .as("O toggle deveria permanecer habilitado após a falha")
                .isTrue();

        // E a página não foi recarregada
        Object marker = ((JavascriptExecutor) driver).executeScript("return window.__noReloadMarker === true;");
        assertThat(marker)
                .as("A página não deveria ter sido recarregada (SPA)")
                .isEqualTo(true);
    }

    @Test
    @DisplayName("[US12] toggle_RedeVoltaAposFalha_PermiteNovaTentativaEAtualizaStatus")
    void toggle_NetworkRestoredAfterFailure_AllowsRetryAndUpdatesStatus() {
        // Dado que a primeira tentativa falha com a rede offline
        setOffline(true);
        toggle().click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("toastNotification")));

        // Quando a rede é restabelecida e o tutor clica novamente
        setOffline(false);
        toggle().click();

        // Então o status é atualizado para "Avaliações Abertas"
        boolean updated = wait.until(ExpectedConditions.textToBe(By.id("statusAssessmentLabel"), OPEN_LABEL));
        assertThat(updated)
                .as("Após a segunda tentativa bem-sucedida o status deveria indicar avaliações abertas")
                .isTrue();
    }
}