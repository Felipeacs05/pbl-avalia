package com.uefs.tfs.avaliasystem.US22.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Contrato assumido:
 * - Page Object Model para a tela de Verificação de E-mail (US22).
 * - Elementos mapeados por IDs semânticos conforme especificação:
 *   - mensagem-verificacao-sucesso: container exibido ao confirmar token com sucesso.
 *   - mensagem-verificacao-erro: alerta exibido quando o token for inválido, expirado ou reutilizado.
 *   - btn-reenviar-verificacao: botão para solicitar reenvio de novo e-mail de ativação.
 *   - aviso-conta-nao-verificada: banner/aviso no Dashboard ou modal alertando sobre conta não confirmada.
 *   - email-reenvio: campo de input opcional para digitação do e-mail ao reenviar.
 *   - mensagem-reenvio-sucesso: feedback visual de confirmação do reenvio do link.
 * - Esperas explícitas (WebDriverWait) de 10 segundos, sem uso de Thread.sleep.
 */
public class VerifyEmailPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores exigidos na especificação de QA
    private final By successMessageAlert = By.id("mensagem-verificacao-sucesso");
    private final By errorMessageAlert = By.id("mensagem-verificacao-erro");
    private final By resendVerificationButton = By.id("btn-reenviar-verificacao");
    private final By unverifiedAccountWarning = By.id("aviso-conta-nao-verificada");
    private final By resendEmailInput = By.id("email-reenvio");
    private final By resendSuccessMessage = By.id("mensagem-reenvio-sucesso");

    public VerifyEmailPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void navigateToVerification(String baseUrl, String token) {
        driver.get(baseUrl + "/verify-email?token=" + token);
    }

    public void navigateToResend(String baseUrl) {
        driver.get(baseUrl + "/verify-email/resend");
    }

    public boolean isSuccessMessageVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(successMessageAlert)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public String getSuccessMessageText() {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(successMessageAlert));
        return element.getText();
    }

    public boolean isErrorMessageVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(errorMessageAlert)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public String getErrorMessageText() {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(errorMessageAlert));
        return element.getText();
    }

    public boolean isUnverifiedAccountWarningVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(unverifiedAccountWarning)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void clickResendVerification() {
        WebElement button = wait.until(ExpectedConditions.elementToBeClickable(resendVerificationButton));
        button.click();
    }

    public void fillResendEmail(String email) {
        WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(resendEmailInput));
        input.clear();
        input.sendKeys(email);
    }

    public boolean isResendSuccessFeedbackVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(resendSuccessMessage)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}
