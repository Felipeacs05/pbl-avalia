/*
package com.uefs.tfs.avaliasystem.US04.e2e;

import com.uefs.tfs.avaliasystem.US02.e2e.LoginPage;
import org.junit.jupiter.api.*;
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
 * E2E da US04. Premissas (ajustar ao ambiente):
 *  - front em http://localhost:5173 (mesmo dos E2E da US01/US02) e API em http://localhost:8080;
 *  - seed: sala com código JOIN01 criada por OUTRO usuário e aluno marina@uefs.br (mesmo da US02);
 *  - endpoint de apoio POST /test-support/rate-limit/reset, EXISTENTE SÓ no perfil de teste
 *    (nunca em produção: permitiria zerar o bloqueio anti-brute-force);
 *  - o ingresso é idempotente, então repetir o teste com a mesma aluna continua dando sucesso.

@Tag("e2e")
@DisplayName("US04 - Testes E2E com Selenium (Ingresso em Salas)")
class JoinRoomSeleniumTest {

    private static final String FRONT_URL = "http://localhost:5173";
    private static final String API_URL = "http://localhost:8080";
    private static final String VALID_CODE = "JOIN01";
    private static final String INVALID_CODE = "INVALID1";
    private static final String INVALID_MSG = "Invalid access code.";
    private static final String BLOCKED_MSG = "Too many failed attempts. Please try again later.";

    private WebDriver driver;

    @BeforeEach
    void setUp() throws Exception {
        resetRateLimit();

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1920,1080");
        driver = new ChromeDriver(options);

        login();
        driver.get(FRONT_URL + "/join-room");
    }

    @AfterEach
    void tearDown() {
        if (driver != null) driver.quit();
    }

    @Test
    void shouldJoinRoomSuccessfullyWithValidCode() {
        JoinRoomPage page = new JoinRoomPage(driver);
        page.joinWithCode(VALID_CODE);
        assertThat(page.isSuccessMessageDisplayed()).isTrue();
    }

    @Test
    void shouldJoinRoomAutomaticallyViaInviteLink() {
        driver.get(FRONT_URL + "/app/join/" + VALID_CODE);
        assertThat(new JoinRoomPage(driver).isSuccessMessageDisplayed())
                .as("Ingresso via link é automático, sem digitar o código").isTrue();
    }

    @Test
    void shouldShowErrorWhenInviteLinkHasInvalidCode() {
        driver.get(FRONT_URL + "/app/join/" + INVALID_CODE);
        new JoinRoomPage(driver).waitForErrorMessageContaining(INVALID_MSG);
    }

    @Test
    void shouldShowInvalidCodeErrorOnSingleFailedAttempt() {
        JoinRoomPage page = new JoinRoomPage(driver);
        page.joinWithCode(INVALID_CODE);
        page.waitForErrorMessageContaining(INVALID_MSG);
    }

    @Test
    void shouldNotBlockAfterFourFailuresAndStillJoinWithValidCode() {
        JoinRoomPage page = new JoinRoomPage(driver);
        for (int i = 1; i <= 4; i++) {
            page.joinWithCode(INVALID_CODE);
            page.waitForErrorMessageContaining(INVALID_MSG);
        }
        page.joinWithCode(VALID_CODE);
        assertThat(page.isSuccessMessageDisplayed()).isTrue();
    }

    @Test
    void shouldBlockAfterFiveConsecutiveFailedAttempts() {
        JoinRoomPage page = new JoinRoomPage(driver);
        for (int i = 1; i <= 5; i++) {
            page.joinWithCode(INVALID_CODE);
            page.waitForErrorMessageContaining(INVALID_MSG);
        }
        page.joinWithCode(INVALID_CODE);
        page.waitForErrorMessageContaining(BLOCKED_MSG);
    }

    @Test
    void shouldStayBlockedEvenWithCorrectCodeAfterFiveFailures() {
        JoinRoomPage page = new JoinRoomPage(driver);
        for (int i = 1; i <= 5; i++) {
            page.joinWithCode(INVALID_CODE);
            page.waitForErrorMessageContaining(INVALID_MSG);
        }
        page.joinWithCode(VALID_CODE);
        page.waitForErrorMessageContaining(BLOCKED_MSG);
    }

    // ───────── helpers ─────────

    private void login() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo(FRONT_URL);
        loginPage.fillCredentials("marina@uefs.br", "SenhaForte@2026");
        loginPage.submit();
        // Espera o login concluir antes de navegar (evita abortar a requisição em andamento)
        new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.urlContains("/dashboard"));
    }

    private void resetRateLimit() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "/test-support/rate-limit/reset"))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding());
    }
}

 */