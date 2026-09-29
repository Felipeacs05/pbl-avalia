package com.uefs.tfs.avaliasystem.US04.e2e;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/** Page Object da tela de ingresso em salas (US04). */
public class JoinRoomPage {

    private final WebDriverWait wait;

    @FindBy(id = "roomAccessCodeInput")
    private WebElement accessCodeInput;

    @FindBy(id = "joinRoomBtn")
    private WebElement joinRoomButton;

    @FindBy(id = "successJoinMessage")
    private WebElement successMessage;

    @FindBy(id = "errorMessage")
    private WebElement errorMessage;

    public JoinRoomPage(WebDriver driver) {
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        PageFactory.initElements(driver, this);
    }

    public JoinRoomPage enterAccessCode(String code) {
        wait.until(ExpectedConditions.visibilityOf(accessCodeInput));
        accessCodeInput.clear();
        accessCodeInput.sendKeys(code);
        return this;
    }

    public JoinRoomPage clickJoinButton() {
        wait.until(ExpectedConditions.elementToBeClickable(joinRoomButton));
        joinRoomButton.click();
        return this;
    }

    public JoinRoomPage joinWithCode(String code) {
        return enterAccessCode(code).clickJoinButton();
    }

    public boolean isSuccessMessageDisplayed() {
        wait.until(ExpectedConditions.visibilityOf(successMessage));
        return successMessage.isDisplayed();
    }

    public String waitForErrorMessageContaining(String expectedText) {
        wait.until(ExpectedConditions.textToBePresentInElement(errorMessage, expectedText));
        return errorMessage.getText();
    }
}