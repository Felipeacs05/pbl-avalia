package com.uefs.tfs.avaliasystem.US24.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.UUID;

/**
 * Contrato assumido:
 * - Page Object Model para a tela de Membros da Sala (Visão do Tutor — US24).
 * - Seletores baseados em IDs semânticos conforme especificação:
 *   - btn-remover-aluno_{uuid}: botão individual de remoção por aluno (data-testid ou id com UUID do aluno).
 *   - modal-confirmar-remocao: modal de confirmação antes do DELETE.
 *   - texto-aviso-historico: parágrafo com as strings "histórico será preservado" e "acesso será revogado".
 *   - btn-confirmar-remocao: botão de confirmação dentro do modal.
 *   - btn-cancelar-remocao: botão de cancelamento dentro do modal.
 *   - toastNotification: toast de feedback após a operação.
 * - Esperas explícitas (WebDriverWait) de 10 segundos. Sem Thread.sleep.
 */
public class RoomMembersPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores estáticos do modal
    private final By modalLocator        = By.id("modal-confirmar-remocao");
    private final By warningTextLocator  = By.id("texto-aviso-historico");
    private final By confirmBtnLocator   = By.id("btn-confirmar-remocao");
    private final By cancelBtnLocator    = By.id("btn-cancelar-remocao");
    private final By toastLocator        = By.id("toastNotification");

    public RoomMembersPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    /** Navega para a página de membros da sala. */
    public void navigateTo(String baseUrl, UUID roomId) {
        driver.get(baseUrl + "/rooms/" + roomId + "/members");
    }

    /** Clica no botão de remover aluno específico pelo UUID. */
    public void clickRemoveStudentButton(UUID studentId) {
        By removeBtn = By.id("btn-remover-aluno_" + studentId);
        WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(removeBtn));
        btn.click();
    }

    /** Aguarda o modal de confirmação aparecer e retorna true se visível. */
    public boolean isConfirmationModalVisible() {
        try {
            WebElement modal = wait.until(ExpectedConditions.visibilityOfElementLocated(modalLocator));
            return modal.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    /** Lê o texto do aviso dentro do modal (deve conter as frases chave do PRD). */
    public String getWarningText() {
        WebElement text = wait.until(ExpectedConditions.visibilityOfElementLocated(warningTextLocator));
        return text.getText();
    }

    /** Clica em CONFIRMAR dentro do modal. */
    public void confirmRemoval() {
        WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(confirmBtnLocator));
        btn.click();
    }

    /** Clica em CANCELAR dentro do modal. */
    public void cancelRemoval() {
        WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(cancelBtnLocator));
        btn.click();
    }

    /** Aguarda e retorna true se o toast de sucesso/erro aparecer. */
    public boolean waitForToast() {
        try {
            WebElement toast = wait.until(ExpectedConditions.visibilityOfElementLocated(toastLocator));
            return toast.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    /** Retorna true se o aluno ainda aparece na lista de membros após a operação (sem reload). */
    public boolean isStudentVisibleInList(UUID studentId) {
        try {
            By studentRow = By.id("btn-remover-aluno_" + studentId);
            driver.findElement(studentRow);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Aguarda que o aluno desapareça da lista (remoção reativa sem reload de página). */
    public boolean waitForStudentToDisappear(UUID studentId) {
        try {
            By studentRow = By.id("btn-remover-aluno_" + studentId);
            return wait.until(ExpectedConditions.invisibilityOfElementLocated(studentRow));
        } catch (Exception e) {
            return false;
        }
    }

    /** Aguarda que o modal desapareça após cancelar ou confirmar. */
    public boolean waitForModalToDisappear() {
        return wait.until(ExpectedConditions.invisibilityOfElementLocated(modalLocator));
    }
}
