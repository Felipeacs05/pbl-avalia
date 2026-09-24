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
public class CadastroPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores dos elementos da interface
    private final By inputNome = By.id("nome");
    private final By inputEmail = By.id("email");
    private final By inputSenha = By.id("senha");
    private final By inputFileFoto = By.id("foto-perfil");
    private final By btnCadastrar = By.id("btn-cadastrar");
    private final By spinnerLoading = By.id("upload-loading-spinner");
    private final By mensagemSucesso = By.id("mensagem-sucesso");
    private final By mensagemErroFoto = By.id("erro-foto-obrigatoria");

    public CadastroPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void acessar(String baseUrl) {
        driver.get(baseUrl + "/cadastro");
    }

    public void preencherFormulario(String nome, String email, String senha) {
        driver.findElement(inputNome).clear();
        driver.findElement(inputNome).sendKeys(nome);
        driver.findElement(inputEmail).clear();
        driver.findElement(inputEmail).sendKeys(email);
        driver.findElement(inputSenha).clear();
        driver.findElement(inputSenha).sendKeys(senha);
    }

    public void anexarFoto(String caminhoAbsolutoArquivo) {
        WebElement inputFoto = driver.findElement(inputFileFoto);
        inputFoto.sendKeys(caminhoAbsolutoArquivo);
    }

    public void submeter() {
        driver.findElement(btnCadastrar).click();
    }

    /**
     * Valida o Critério de Aceite 3 (Desempenho/UX):
     * Aguarda explicitamente o componente de loading (spinner/barra de progresso)
     * ficar visível durante a requisição de upload.
     */
    public boolean aguardarAparicaoLoading() {
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
    public boolean aguardarDesaparecimentoLoading() {
        return wait.until(ExpectedConditions.invisibilityOfElementLocated(spinnerLoading));
    }

    public boolean isMensagemSucessoVisivel() {
        WebElement msg = wait.until(ExpectedConditions.visibilityOfElementLocated(mensagemSucesso));
        return msg.isDisplayed();
    }

    public boolean isErroFotoObrigatoriaVisivel() {
        WebElement erro = wait.until(ExpectedConditions.visibilityOfElementLocated(mensagemErroFoto));
        return erro.isDisplayed();
    }
}
