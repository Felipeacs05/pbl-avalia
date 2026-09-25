package com.uefs.tfs.avaliasystem.US01.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Page Object Model (POM) para a página de Cadastro de Usuário (US01).
 * Encapsula seletores, interações e esperas explícitas (Explicit Waits).
 */
public class RegisterPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores dos elementos da interface
    private final By nameInput = By.id("nome");
    private final By emailInput = By.id("email");
    private final By passwordInput = By.id("senha");
    private final By photoFileInput = By.id("foto-perfil");
    private final By registerButton = By.id("btn-cadastrar");
    private final By spinnerLoading = By.id("upload-loading-spinner");
    private final By successMessage = By.id("mensagem-sucesso");
    private final By photoErrorMessage = By.id("erro-foto-obrigatoria");

    public RegisterPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void accessUrl(String baseUrl) {
        driver.get(baseUrl + "/cadastro");
    }

    public void fillOutForm(String name, String email, String password) {
        driver.findElement(nameInput).clear();
        driver.findElement(nameInput).sendKeys(name);
        driver.findElement(emailInput).clear();
        driver.findElement(emailInput).sendKeys(email);
        driver.findElement(passwordInput).clear();
        driver.findElement(passwordInput).sendKeys(password);
    }

    public void attachPhoto(String absoluteFilePath) {
        WebElement photoInput = driver.findElement(photoFileInput);
        photoInput.sendKeys(absoluteFilePath);
    }

    public void submit() {
        driver.findElement(registerButton).click();
    }

    /**
     * Valida o Critério de Aceite 3 (Desempenho/UX):
     * Aguarda explicitamente o componente de loading (spinner/barra de progresso)
     * ficar visível durante a requisição de upload.
     */
    public boolean waitForLoadingToAppear() {
        try {
            WebElement spinner = wait.until(ExpectedConditions.visibilityOfElementLocated(spinnerLoading));
            return spinner.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Aguarda o componente de loading desaparecer após a conclusão da resposta.
     */
    public boolean waitForLoadingToDisappear() {
        return wait.until(ExpectedConditions.invisibilityOfElementLocated(spinnerLoading));
    }

    public boolean isSuccessMessageVisible() {
        WebElement msg = wait.until(ExpectedConditions.visibilityOfElementLocated(successMessage));
        return msg.isDisplayed();
    }

    public boolean isMandatoryPhotoErrorVisible() {
        WebElement error = wait.until(ExpectedConditions.visibilityOfElementLocated(photoErrorMessage));
        return error.isDisplayed();
    }
}