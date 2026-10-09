package com.uefs.tfs.avaliasystem.US14.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.UUID;

/**
 * Page Object Model da tela de Avaliação de Pares (US14).
 */
public class PeerAssessmentPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By listPeerStudents = By.id("listPeerStudents");
    private final By btnSubmitPeerAssessment = By.id("btnSubmitPeerAssessment");
    private final By toastNotification = By.id("toastNotification");

    public PeerAssessmentPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void navigateTo(String baseUrl, UUID problemId) {
        driver.get(baseUrl + "/problems/" + problemId);
    }

    public boolean isPeerListVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(listPeerStudents)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void fillScoreAndCommentForPeer(UUID peerId, double score, String comment) {
        By scoreBy = By.id("inputPeerScore_" + peerId);
        WebElement scoreInput = wait.until(ExpectedConditions.visibilityOfElementLocated(scoreBy));
        scoreInput.clear();
        scoreInput.sendKeys(String.valueOf(score));

        By commentBy = By.id("inputPeerComment_" + peerId);
        WebElement commentInput = driver.findElement(commentBy);
        commentInput.clear();
        commentInput.sendKeys(comment);
    }

    public void submit() {
        driver.findElement(btnSubmitPeerAssessment).click();
    }

    public String getToastMessage() {
        WebElement toast = wait.until(ExpectedConditions.visibilityOfElementLocated(toastNotification));
        return toast.getText();
    }
}
