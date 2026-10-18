package com.uefs.tfs.avaliasystem.US13.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.UUID;

/**
 * Page Object Model para Autoavaliação do Aluno (US13).
 */
public class SelfAssessmentPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By formSelfAssessment = By.id("formSelfAssessment");
    private final By inputSelfScore = By.id("inputSelfScore");
    private final By inputSelfComment = By.id("inputSelfComment");
    private final By btnSubmit = By.id("btnSubmitSelfAssessment");
    private final By toastNotification = By.id("toastNotification");

    public SelfAssessmentPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void navigateTo(String baseUrl, UUID problemId) {
        driver.get(baseUrl + "/problems/" + problemId);
    }

    public boolean isFormVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(formSelfAssessment)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void fillAssessment(double score, String comment) {
        WebElement scoreInput = wait.until(ExpectedConditions.visibilityOfElementLocated(inputSelfScore));
        scoreInput.clear();
        scoreInput.sendKeys(String.valueOf(score));

        WebElement commentInput = driver.findElement(inputSelfComment);
        commentInput.clear();
        commentInput.sendKeys(comment);
    }

    public void submit() {
        driver.findElement(btnSubmit).click();
    }

    public String getToastMessage() {
        WebElement toast = wait.until(ExpectedConditions.visibilityOfElementLocated(toastNotification));
        return toast.getText();
    }
}
