package com.uefs.tfs.avaliasystem.US02.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

/**
 * Page Object Model para a tela de Dashboard (US02).
 * Encapsula a validação visual das abas:
 *   - "Salas que administro (Tutor)"
 *   - "Salas que participo (Aluno)"
 */
public class DashboardPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores semânticos das abas e seções
    private final By containerDashboard = By.id("dashboard-container");
    private final By tabTutor = By.id("tab-tutor");
    private final By tabAluno = By.id("tab-aluno");
    private final By secaoSalasTutor = By.id("secao-salas-tutor");
    private final By secaoSalasAluno = By.id("secao-salas-aluno");
    private final By cardSala = By.className("card-sala");
    private final By nomeSala = By.className("nome-sala");

    public DashboardPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public boolean aguardarCarregamento() {
        try {
            wait.until(ExpectedConditions.or(
                    ExpectedConditions.urlContains("/dashboard"),
                    ExpectedConditions.visibilityOfElementLocated(containerDashboard)
            ));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAbaTutorVisivel() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(tabTutor)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAbaAlunoVisivel() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(tabAluno)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void selecionarAbaTutor() {
        WebElement tab = wait.until(ExpectedConditions.elementToBeClickable(tabTutor));
        tab.click();
    }

    public void selecionarAbaAluno() {
        WebElement tab = wait.until(ExpectedConditions.elementToBeClickable(tabAluno));
        tab.click();
    }

    public boolean isSecaoSalasTutorExibida() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(secaoSalasTutor)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isSecaoSalasAlunoExibida() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(secaoSalasAluno)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public int getQuantidadeSalasTutor() {
        WebElement secao = wait.until(ExpectedConditions.visibilityOfElementLocated(secaoSalasTutor));
        List<WebElement> cards = secao.findElements(cardSala);
        return cards.size();
    }

    public int getQuantidadeSalasAluno() {
        WebElement secao = wait.until(ExpectedConditions.visibilityOfElementLocated(secaoSalasAluno));
        List<WebElement> cards = secao.findElements(cardSala);
        return cards.size();
    }
}
