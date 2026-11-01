package com.uefs.tfs.avaliasystem.US07.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;

/**
 * Page Object Model para a tela de Critérios da Sala (US07) — Modelo A.
 *
 * Navega para /rooms/{roomId}/criteria e encapsula os seletores de elementos,
 * esperas explícitas (WebDriverWait) e ações de UI.
 *
 * IDs de DOM mantidos conforme o plano de testes (US07_test_plan.md):
 *   inputCriterionName         ✅ mantido
 *   inputCriterionDescription  ✅ mantido
 *   inputCriterionWeight       ✅ mantido
 *   btnAddCriterion            ✅ mantido
 *   tableCriteriaList          ✅ mantido
 *   rowCriterionItem_{id}      ✅ mantido
 *   feedbackErrorCriteriaName  ✅ mantido
 *   btnRemoveCriterion_{id}    ✅ mantido
 *   toastNotification          ✅ mantido
 *
 * IDs REMOVIDOS (não existem mais no Modelo A — sem entidade "tabela" visível):
 *   inputPerformanceTableName  ❌ removido (sem tableName na API)
 *   btnSavePerformanceTable    ❌ removido (critério é salvo individualmente via POST /criteria)
 *   formPerformanceTable       ❌ removido (substituído por formCriteria)
 *
 * IDs ADICIONADOS:
 *   formCriteria               ➕ formulário de gerenciamento de critérios da sala
 */
public class CriteriaPage {

    private final WebDriver driver;
    private final WebDriverWait wait;

    // Seletores dos elementos da interface (Frontend DOM IDs)
    private final By criterionNameInput        = By.id("inputCriterionName");
    private final By criterionDescriptionInput = By.id("inputCriterionDescription");
    private final By criterionWeightInput      = By.id("inputCriterionWeight");
    private final By addCriterionButton        = By.id("btnAddCriterion");
    private final By criteriaListContainer     = By.id("tableCriteriaList");
    private final By errorFeedback             = By.id("feedbackErrorCriteriaName");

    public CriteriaPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    /**
     * Navega para a tela de gerenciamento de critérios de uma sala específica.
     * Rota do frontend: /rooms/{roomId}/criteria
     */
    public void navigateTo(String baseUrl, String roomId) {
        driver.get(baseUrl + "/rooms/" + roomId + "/criteria");
        wait.until(ExpectedConditions.visibilityOfElementLocated(criterionNameInput));
    }

    /**
     * Adiciona um critério preenchendo os campos do formulário e clicando em btnAddCriterion.
     * Se criteriaName for nulo ou vazio, o campo é deixado em branco para simular erro de validação.
     */
    public void addCriterion(String criteriaName, String criteriaDescription, String criteriaWeight) {
        WebElement nameInput = wait.until(ExpectedConditions.visibilityOfElementLocated(criterionNameInput));
        nameInput.clear();
        if (criteriaName != null && !criteriaName.isEmpty()) {
            nameInput.sendKeys(criteriaName);
        }

        if (criteriaDescription != null) {
            WebElement descInput = driver.findElement(criterionDescriptionInput);
            descInput.clear();
            descInput.sendKeys(criteriaDescription);
        }

        if (criteriaWeight != null) {
            WebElement weightInput = driver.findElement(criterionWeightInput);
            weightInput.clear();
            weightInput.sendKeys(criteriaWeight);
        }

        driver.findElement(addCriterionButton).click();
    }

    /**
     * Remove um critério localizando robustamente a linha .rowCriterionItem pelo texto do critério
     * e, dentro da mesma linha, acionando o botão correspondente btnRemoveCriterion_* com WebDriverWait.
     */
    public void removeCriterion(String criterionName) {
        By rowSelector = By.xpath("//*[@id='tableCriteriaList']//*[contains(@class, 'rowCriterionItem') and .//*[contains(text(), '" + criterionName + "')]]");
        WebElement rowElement = wait.until(ExpectedConditions.visibilityOfElementLocated(rowSelector));

        WebElement removeButton = wait.until(ExpectedConditions.elementToBeClickable(
                rowElement.findElement(By.xpath(".//button[starts-with(@id, 'btnRemoveCriterion_')]"))
        ));
        removeButton.click();
    }

    public boolean isCriterionPresent(String criteriaName) {
        try {
            By itemLocator = By.xpath("//*[@id='tableCriteriaList']//*[contains(text(), '" + criteriaName + "')]");
            return !driver.findElements(itemLocator).isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    public int getCriteriaCount() {
        WebElement container = wait.until(ExpectedConditions.visibilityOfElementLocated(criteriaListContainer));
        List<WebElement> items = container.findElements(By.className("rowCriterionItem"));
        return items.size();
    }

    public String getErrorMessage() {
        WebElement errorEl = wait.until(ExpectedConditions.visibilityOfElementLocated(errorFeedback));
        return errorEl.getText();
    }

    public boolean isErrorMessageDisplayed() {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(errorFeedback)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Aguarda a lista de critérios ser recarregada após um GET (útil para verificar persistência).
     */
    public void waitForCriteriaListToLoad() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(criteriaListContainer));
    }
}
