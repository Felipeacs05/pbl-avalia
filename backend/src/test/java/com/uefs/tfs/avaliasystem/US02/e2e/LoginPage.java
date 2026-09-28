package com.uefs.tfs.avaliasystem.US02.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

/**
 * Page Object Model para a tela de Login (US02).
 * Encapsula seletores, interações e esperas explícitas (Explicit Waits).
 */
public class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores dos elementos da interface de Login
    private final By emailInput = By.id("email");
    private final By passwordInput = By.id("senha");
    private final By loginButton = By.id("btn-entrar");
    private final By errorAlert = By.id("alerta-erro-login");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void navigateTo(String baseUrl) {
        driver.get(baseUrl + "/login");
    }

    public void fillCredentials(String email, String password) {
        WebElement emailEl = wait.until(ExpectedConditions.visibilityOfElementLocated(emailInput));
        emailEl.clear();
        emailEl.sendKeys(email);

        WebElement passwordEl = driver.findElement(passwordInput);
        passwordEl.clear();
        passwordEl.sendKeys(password);
    }

    public void submit() {
        driver.findElement(loginButton).click();
    }

    public String getErrorMessage() {
        WebElement erro = wait.until(ExpectedConditions.visibilityOfElementLocated(errorAlert));
        return erro.getText();
    }

    public boolean isErrorAlertVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(errorAlert)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}