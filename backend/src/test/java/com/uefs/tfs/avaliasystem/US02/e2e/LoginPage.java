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
    private final By inputEmail = By.id("email");
    private final By inputSenha = By.id("senha");
    private final By btnEntrar = By.id("btn-entrar");
    private final By alertaErro = By.id("alerta-erro-login");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void acessar(String baseUrl) {
        driver.get(baseUrl + "/login");
    }

    public void preencherCredenciais(String email, String senha) {
        WebElement emailEl = wait.until(ExpectedConditions.visibilityOfElementLocated(inputEmail));
        emailEl.clear();
        emailEl.sendKeys(email);

        WebElement senhaEl = driver.findElement(inputSenha);
        senhaEl.clear();
        senhaEl.sendKeys(senha);
    }

    public void submeter() {
        driver.findElement(btnEntrar).click();
    }

    public String obterMensagemErro() {
        WebElement erro = wait.until(ExpectedConditions.visibilityOfElementLocated(alertaErro));
        return erro.getText();
    }

    public boolean isAlertaErroVisivel() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(alertaErro)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}
