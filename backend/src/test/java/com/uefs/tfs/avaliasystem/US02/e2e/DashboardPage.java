package com.uefs.tfs.avaliasystem.US02.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

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
    private final By dashboardContainer = By.id("dashboard-container");
    private final By tutorTab = By.id("tab-tutor");
    private final By studentTab = By.id("tab-aluno");
    private final By tutorRoomsSection = By.id("secao-salas-tutor");
    private final By studentRoomsSection = By.id("secao-salas-aluno");
    private final By roomCard = By.className("card-sala");

    public DashboardPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public boolean waitForLoading() {
        try {
            wait.until(ExpectedConditions.or(
                    ExpectedConditions.urlContains("/dashboard"),
                    ExpectedConditions.visibilityOfElementLocated(dashboardContainer)
            ));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isTutorTabVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(tutorTab)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isStudentTabVisible() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(studentTab)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void selectTutorTab() {
        WebElement tab = wait.until(ExpectedConditions.elementToBeClickable(tutorTab));
        tab.click();
    }

    public void selectStudentTab() {
        WebElement tab = wait.until(ExpectedConditions.elementToBeClickable(studentTab));
        tab.click();
    }

    public boolean isTutorRoomsSectionDisplayed() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(tutorRoomsSection)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isStudentRoomsSectionDisplayed() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(studentRoomsSection)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}