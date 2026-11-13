package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.AuthController;
import com.uefs.tfs.avaliasystem.dto.EmailVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.ResendVerificationRequest;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailVerificationService;
import com.uefs.tfs.avaliasystem.service.PasswordResetService;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato assumido:
 * - Endpoints públicos (liberados no SecurityConfig sem autenticação):
 *   - POST /api/v1/auth/email/verify
 *     - Request Body: EmailVerificationRequest { token: String (@NotBlank) }
 *     - Response: 200 OK { message: "E-mail verificado com sucesso." }
 *     - Erros: 400 Bad Request se token em branco { message: "Validation failed", errors: { token: ... } }
 *              400 Bad Request se token inválido/expirado { message: "Token inválido ou expirado." }
 *   - POST /api/v1/auth/email/resend
 *     - Request Body: ResendVerificationRequest { email: String (@NotBlank, @Email) }
 *     - Response: 200 OK com mensagem IDÊNTICA exista ou não o e-mail na base (anti-enumeração de usuários):
 *       { message: "Se o e-mail estiver cadastrado e ainda não verificado, você receberá um novo link de confirmação." }
 *     - Erros: 400 Bad Request se e-mail ausente ou malformado.
 * - Controller responsável: AuthController (unifica rotas de /api/v1/auth/**)
 * - Mocks necessários para SecurityConfig:
 *   - UserRepository (usado pelo validador de JWT/tokenVersion)
 *   - UserService, PasswordResetService, EmailVerificationService
 */
@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US22] Testes da Camada Web (AuthController / Verificação de E-mail)")
class EmailVerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private PasswordResetService passwordResetService;

    @MockitoBean
    private EmailVerificationService emailVerificationService;

    private static final String VERIFY_URL = "/api/v1/auth/email/verify";
    private static final String RESEND_URL = "/api/v1/auth/email/resend";

    // --- VERIFY ENDPOINT ---

    @Test
    @DisplayName("[US22] POST /email/verify com token válido deve retornar 200 e mensagem de sucesso")
    void verify_ValidToken_Returns200WithSuccessMessage() throws Exception {
        // Arrange
        String validToken = "valid-verification-token-123";
        String requestJson = objectMapper.writeValueAsString(new EmailVerificationRequest(validToken));

        // Act & Assert
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("E-mail verificado com sucesso."));

        verify(emailVerificationService, times(1)).verify(validToken);
    }

    @Test
    @DisplayName("[US22] POST /email/verify com token em branco deve retornar 400 e mapa de errors de validação")
    void verify_BlankToken_Returns400WithValidationErrors() throws Exception {
        // Arrange
        String requestJson = objectMapper.writeValueAsString(new EmailVerificationRequest(""));

        // Act & Assert
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.token").exists());

        verify(emailVerificationService, never()).verify(any());
    }

    @Test
    @DisplayName("[US22] POST /email/verify quando Service lança IllegalArgumentException deve retornar 400 com mensagem exata")
    void verify_InvalidOrExpiredToken_Returns400WithExactMessage() throws Exception {
        // Arrange
        String invalidToken = "token-expirado-ou-usado";
        doThrow(new IllegalArgumentException("Token inválido ou expirado."))
                .when(emailVerificationService).verify(invalidToken);

        String requestJson = objectMapper.writeValueAsString(new EmailVerificationRequest(invalidToken));

        // Act & Assert
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));

        verify(emailVerificationService, times(1)).verify(invalidToken);
    }

    // --- RESEND ENDPOINT ---

    @Test
    @DisplayName("[US22] POST /email/resend deve retornar resposta 200 com corpo rigorosamente IDÊNTICO para e-mail cadastrado e não cadastrado (Anti-enumeração)")
    void resend_RegisteredAndUnregisteredEmails_ReturnIdenticalResponseToPreventEnumeration() throws Exception {
        // Arrange
        String registeredEmailJson = objectMapper.writeValueAsString(new ResendVerificationRequest("cadastrado@uefs.br"));
        String unregisteredEmailJson = objectMapper.writeValueAsString(new ResendVerificationRequest("inexistente@uefs.br"));

        // Act
        String registeredResponse = mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registeredEmailJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andReturn().getResponse().getContentAsString();

        String unregisteredResponse = mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(unregisteredEmailJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andReturn().getResponse().getContentAsString();

        // Assert (A resposta deve ser idêntica caractere por caractere para impedir enumeração de e-mails)
        assertEquals(registeredResponse, unregisteredResponse,
                "A resposta deve ser estritamente a mesma para e-mails cadastrados e não cadastrados");

        verify(emailVerificationService).resendVerification("cadastrado@uefs.br");
        verify(emailVerificationService).resendVerification("inexistente@uefs.br");
    }

    @Test
    @DisplayName("[US22] POST /email/resend com e-mail malformado deve retornar 400 Bad Request")
    void resend_InvalidOrMalformedEmail_Returns400WithValidationErrors() throws Exception {
        // Arrange
        String requestJson = objectMapper.writeValueAsString(new ResendVerificationRequest("email-invalido-sem-arroba"));

        // Act & Assert
        mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.email").exists());

        verify(emailVerificationService, never()).resendVerification(any());
    }

    // --- SEGURANÇA E ACESSO PÚBLICO ---

    @Test
    @DisplayName("[US22] Rotas de verificação e reenvio devem ser públicas e acessíveis sem JWT (não retornar 401)")
    void verificationRoutes_WithoutJwtToken_AccessibleWithoutReturning401() throws Exception {
        // Verify não deve dar 401 mesmo sem header Authorization
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest("token-qualquer"))))
                .andExpect(status().isOk());

        // Resend não deve dar 401 mesmo sem header Authorization
        mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResendVerificationRequest("user@uefs.br"))))
                .andExpect(status().isOk());
    }
}
