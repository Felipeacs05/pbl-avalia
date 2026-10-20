package com.uefs.tfs.avaliasystem.US12.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.UUID;

/**
 * Page Object Model da tela de Liberação de Avaliações (US12).
 * Mapeia os IDs definidos no docs/US12_US13_US14_test_plan.md
 */
public class AssessmentReleasePage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By statusLabel = By.id("statusAssessmentLabel");
    private final By toastNotification = By.id("toastNotification");

    public AssessmentReleasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void navigateTo(String baseUrl, UUID problemId) {
        driver.get(baseUrl + "/problems/" + problemId);
    }

    public void clickSelfAssessmentToggle(UUID problemId) {
        By toggleBy = By.id("toggleSelfAssessment_" + problemId);
        WebElement toggle = wait.until(ExpectedConditions.elementToBeClickable(toggleBy));
        toggle.click();
    }

    public String getStatusLabelText() {
        WebElement label = wait.until(ExpectedConditions.visibilityOfElementLocated(statusLabel));
        return label.getText();
    }

    public String getToastNotificationText() {
        WebElement toast = wait.until(ExpectedConditions.visibilityOfElementLocated(toastNotification));
        return toast.getText();
    }

    public boolean isToastVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(toastNotification)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}
