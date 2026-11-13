package com.uefs.tfs.avaliasystem.US23.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Contrato assumido:
 * - Page Object Model para a tela de Perfil do Usuário (US23).
 * - Seletores baseados em IDs semânticos conforme especificação:
 *   - nome: campo de input de texto para o nome do usuário.
 *   - foto-perfil: input do tipo file para anexar a foto de perfil.
 *   - btn-salvar-perfil: botão para submissão dos dados cadastrais (nome e foto).
 *   - upload-loading-spinner: componente visual de carregamento durante o upload.
 *   - mensagem-sucesso: container de feedback visual de sucesso na operação.
 *   - erro-foto-invalida: mensagem/alerta exibido para arquivos não suportados ou maiores que 5MB.
 *   - senha-atual: campo de input para confirmação da senha atual.
 *   - nova-senha: campo de input para a nova senha desejada.
 *   - btn-alterar-senha: botão de submissão do formulário de troca de senha.
 *   - erro-senha-atual: mensagem/alerta exibido quando a senha atual informada for incorreta.
 * - Esperas explícitas (WebDriverWait) de 10 segundos sem uso de Thread.sleep.
 */
public class ProfilePage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores do Perfil
    private final By nameInput = By.id("nome");
    private final By photoFileInput = By.id("foto-perfil");
    private final By saveProfileButton = By.id("btn-salvar-perfil");
    private final By loadingSpinner = By.id("upload-loading-spinner");
    private final By successAlert = By.id("mensagem-sucesso");
    private final By photoErrorAlert = By.id("erro-foto-invalida");

    // Seletores de Senha
    private final By currentPasswordInput = By.id("senha-atual");
    private final By newPasswordInput = By.id("nova-senha");
    private final By changePasswordButton = By.id("btn-alterar-senha");
    private final By currentPasswordErrorAlert = By.id("erro-senha-atual");

    public ProfilePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void navigateTo(String baseUrl) {
        driver.get(baseUrl + "/perfil");
    }

    public void fillName(String name) {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(nameInput));
        element.clear();
        element.sendKeys(name);
    }

    public void attachPhoto(String absolutePath) {
        WebElement element = driver.findElement(photoFileInput);
        element.sendKeys(absolutePath);
    }

    public void submitProfile() {
        WebElement button = wait.until(ExpectedConditions.elementToBeClickable(saveProfileButton));
        button.click();
    }

    public boolean waitForLoadingToAppear() {
        try {
            WebElement spinner = wait.until(ExpectedConditions.visibilityOfElementLocated(loadingSpinner));
            return spinner.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean waitForLoadingToDisappear() {
        return wait.until(ExpectedConditions.invisibilityOfElementLocated(loadingSpinner));
    }

    public boolean isSuccessMessageVisible() {
        try {
            WebElement alert = wait.until(ExpectedConditions.visibilityOfElementLocated(successAlert));
            return alert.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isPhotoErrorVisible() {
        try {
            WebElement alert = wait.until(ExpectedConditions.visibilityOfElementLocated(photoErrorAlert));
            return alert.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void fillPasswordForm(String currentPassword, String newPassword) {
        WebElement currentPass = wait.until(ExpectedConditions.visibilityOfElementLocated(currentPasswordInput));
        currentPass.clear();
        currentPass.sendKeys(currentPassword);

        WebElement newPass = driver.findElement(newPasswordInput);
        newPass.clear();
        newPass.sendKeys(newPassword);
    }

    public void submitPasswordChange() {
        WebElement button = wait.until(ExpectedConditions.elementToBeClickable(changePasswordButton));
        button.click();
    }

    public boolean isCurrentPasswordErrorVisible() {
        try {
            WebElement alert = wait.until(ExpectedConditions.visibilityOfElementLocated(currentPasswordErrorAlert));
            return alert.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}
