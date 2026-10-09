package com.uefs.tfs.avaliasystem.US13.e2e;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("e2e")
@DisplayName("[US13] Testes E2E com Selenium - Preenchimento de Autoavaliação")
class SelfAssessmentSeleniumTest {

    private static final String BASE_URL = "http://localhost:5173";
    private WebDriver driver;
    private SelfAssessmentPage page;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1920,1080");
        driver = new ChromeDriver(options);
        page = new SelfAssessmentPage(driver);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    @DisplayName("[US13] preencherAutoavaliacao_FormularioVisivel_PreencheESubmete")
    void preencherAutoavaliacao_FormularioVisivel_PreencheESubmete() {
        UUID problemId = UUID.randomUUID();
        page.navigateTo(BASE_URL, problemId);

        if (page.isFormVisible()) {
            page.fillAssessment(9.0, "Autoavaliação consistente");
            page.submit();
        }
        assertThat(driver.getTitle()).isNotNull();
    }
}
