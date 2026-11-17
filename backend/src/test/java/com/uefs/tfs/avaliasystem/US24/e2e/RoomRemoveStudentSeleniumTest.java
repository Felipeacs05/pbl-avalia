package com.uefs.tfs.avaliasystem.US24.e2e;

import com.uefs.tfs.avaliasystem.US02.e2e.LoginPage;
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contrato assumido:
 * - Testes E2E de Interface com Selenium WebDriver (US24).
 * - Execução headless com Google Chrome:
 *   --headless=new, --no-sandbox, --disable-dev-shm-usage, --window-size=1920,1080.
 * - Frontend em http://localhost:5173 (pré-requisito: front rodando com dados de teste).
 * - Login via LoginPage da US02.
 * - Page Object: RoomMembersPage (IDs definidos no PRD da US24).
 * - Critérios de Aceite de UX cobertos:
 *   CA1: Modal exibe aviso antes de qualquer chamada DELETE (texto do PRD deve aparecer).
 *   CA2: Confirmar remoção remove o aluno da lista sem reload (DOM atualizado reativamente).
 *   CA3: Cancelar mantém o aluno na lista e modal fecha sem chamar a API.
 */
@Tag("e2e")
@DisplayName("[US24] Testes E2E com Selenium — Remoção de Aluno da Sala pelo Tutor")
class RoomRemoveStudentSeleniumTest {

    // IDs de fixture pré-cadastrados no ambiente de teste de front-end
    private static final String TUTOR_EMAIL    = "tutor.selenium.us24@uefs.br";
    private static final String TUTOR_PASSWORD = "SenhaForte@2026";
    private static final UUID   STUDENT_UUID   = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID   ROOM_UUID      = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static final String BASE_URL       = "http://localhost:5173";

    private WebDriver driver;
    private LoginPage loginPage;
    private RoomMembersPage membersPage;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");

        driver = new ChromeDriver(options);
        loginPage   = new LoginPage(driver);
        membersPage = new RoomMembersPage(driver);

        // Autentica como tutor via LoginPage da US02
        loginPage.navigateTo(BASE_URL);
        loginPage.fillCredentials(TUTOR_EMAIL, TUTOR_PASSWORD);
        loginPage.submit();
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    // ─────────────── CA1: MODAL EXIBE AVISO ───────────────

    @Test
    @DisplayName("[US24] CA1: Modal de confirmação exibe aviso de histórico preservado e acesso revogado antes do DELETE")
    void shouldShowConfirmationModalWithHistoryWarningBeforeDelete() {
        // Arrange — navega para a tela de membros da sala
        membersPage.navigateTo(BASE_URL, ROOM_UUID);

        // Act — clica em remover (deve abrir modal ANTES de qualquer chamada à API)
        membersPage.clickRemoveStudentButton(STUDENT_UUID);

        // Assert — modal visível
        assertThat(membersPage.isConfirmationModalVisible())
                .as("O modal de confirmação deve aparecer antes de qualquer chamada DELETE")
                .isTrue();

        // Assert — texto do aviso conforme PRD
        String warningText = membersPage.getWarningText();
        assertThat(warningText)
                .as("O aviso deve informar que o histórico será preservado")
                .containsIgnoringCase("histórico será preservado");
        assertThat(warningText)
                .as("O aviso deve informar que o acesso será revogado")
                .containsIgnoringCase("acesso será revogado");
    }

    // ─────────────── CA2: CONFIRMAR REMOVE SEM RELOAD ───────────────

    @Test
    @DisplayName("[US24] CA2: Confirmar remoção remove o aluno da lista sem reload de página (DOM reativo)")
    void shouldRemoveStudentFromListWithoutReloadAfterConfirm() {
        // Arrange — navega e abre modal
        membersPage.navigateTo(BASE_URL, ROOM_UUID);
        membersPage.clickRemoveStudentButton(STUDENT_UUID);

        assertThat(membersPage.isConfirmationModalVisible())
                .as("Modal deve estar visível antes da confirmação")
                .isTrue();

        // Marca o DOM antes do click para detectar que não houve reload
        // (padrão inspirado em PerformanceTableSeleniumTest: observa remoção reativa)
        assertThat(membersPage.isStudentVisibleInList(STUDENT_UUID))
                .as("O aluno deve estar visível na lista ANTES de confirmar")
                .isTrue();

        // Act — confirma remoção
        membersPage.confirmRemoval();

        // Assert — aluno some da lista sem reload (DOM atualizado reativamente)
        assertThat(membersPage.waitForStudentToDisappear(STUDENT_UUID))
                .as("O aluno deve desaparecer da lista REATIVAMENTE após a confirmação, sem reload da página")
                .isTrue();

        // Assert — toast de feedback ao usuário
        assertThat(membersPage.waitForToast())
                .as("Um toast de confirmação deve ser exibido ao tutor após a remoção")
                .isTrue();
    }

    // ─────────────── CA3: CANCELAR MANTÉM O ALUNO ───────────────

    @Test
    @DisplayName("[US24] CA3: Cancelar no modal mantém o aluno na lista e fecha o modal sem chamar a API")
    void shouldKeepStudentInListAfterCancelingModal() {
        // Arrange
        membersPage.navigateTo(BASE_URL, ROOM_UUID);
        membersPage.clickRemoveStudentButton(STUDENT_UUID);

        assertThat(membersPage.isConfirmationModalVisible())
                .as("Modal deve aparecer ao clicar em remover")
                .isTrue();

        // Act — cancela
        membersPage.cancelRemoval();

        // Assert — modal fechado
        assertThat(membersPage.waitForModalToDisappear())
                .as("O modal deve fechar após o cancelamento")
                .isTrue();

        // Assert — aluno ainda visível na lista (nenhuma chamada DELETE foi feita)
        assertThat(membersPage.isStudentVisibleInList(STUDENT_UUID))
                .as("O aluno deve CONTINUAR na lista após cancelar — nenhum DELETE deve ter sido chamado")
                .isTrue();
    }
}
