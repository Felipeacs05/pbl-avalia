package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.EmailVerificationController;
import com.uefs.tfs.avaliasystem.dto.EmailVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.ResendEmailRequest;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailVerificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
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
 *     - Request Body: ResendEmailRequest { email: String (@NotBlank, @Email) }
 *     - Response: 200 OK com mensagem IDÊNTICA exista ou não o e-mail na base (anti-enumeração de usuários):
 *       { message: "Se o e-mail estiver cadastrado e ainda não verificado, você receberá um novo link de confirmação." }
 *     - Erros: 400 Bad Request se e-mail ausente ou malformado.
 * - Controller responsável: EmailVerificationController
 * - Mocks necessários para SecurityConfig:
 *   - UserRepository (usado pelo validador de JWT/tokenVersion)
 */
@WebMvcTest(EmailVerificationController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US22] Testes da Camada Web (EmailVerificationController)")
class EmailVerificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private EmailVerificationService emailVerificationService;

    private static final String VERIFY_URL = "/api/v1/auth/email/verify";
    private static final String RESEND_URL = "/api/v1/auth/email/resend";

    @Test
    @DisplayName("[US22] POST /email/verify com token válido deve retornar 200 e mensagem de sucesso")
    void verify_ValidToken_Returns200WithSuccessMessage() throws Exception {
        String validToken = "valid-verification-token-123";
        String requestJson = objectMapper.writeValueAsString(new EmailVerificationRequest(validToken));

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
        String requestJson = objectMapper.writeValueAsString(new EmailVerificationRequest(""));

        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.token").exists());

        verify(emailVerificationService, never()).verify(anyString());
    }

    @Test
    @DisplayName("[US22] POST /email/verify quando Service lança IllegalArgumentException deve retornar 400 com mensagem exata")
    void verify_InvalidOrExpiredToken_Returns400WithExactMessage() throws Exception {
        String invalidToken = "token-expirado-ou-usado";
        doThrow(new IllegalArgumentException("Token inválido ou expirado."))
                .when(emailVerificationService).verify(invalidToken);

        String requestJson = objectMapper.writeValueAsString(new EmailVerificationRequest(invalidToken));

        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));

        verify(emailVerificationService, times(1)).verify(invalidToken);
    }

    @Test
    @DisplayName("[US22] POST /email/resend deve retornar resposta 200 com corpo rigorosamente IDÊNTICO para e-mail cadastrado e não cadastrado (Anti-enumeração)")
    void resend_RegisteredAndUnregisteredEmails_ReturnIdenticalResponseToPreventEnumeration() throws Exception {
        User registered = new User();
        registered.setId(UUID.randomUUID());
        registered.setName("Aluno Cadastrado");
        registered.setEmail("cadastrado@uefs.br");
        registered.setEmailVerified(false);

        when(userRepository.findByEmail("cadastrado@uefs.br")).thenReturn(Optional.of(registered));
        when(userRepository.findByEmail("inexistente@uefs.br")).thenReturn(Optional.empty());

        String registeredEmailJson = objectMapper.writeValueAsString(new ResendEmailRequest("cadastrado@uefs.br"));
        String unregisteredEmailJson = objectMapper.writeValueAsString(new ResendEmailRequest("inexistente@uefs.br"));

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

        assertEquals(registeredResponse, unregisteredResponse,
                "A resposta deve ser estritamente a mesma para e-mails cadastrados e não cadastrados");

        verify(emailVerificationService, times(1)).resendEmailVerification(registered);
    }

    @Test
    @DisplayName("[US22] POST /email/resend com e-mail malformado deve retornar 400 Bad Request")
    void resend_InvalidOrMalformedEmail_Returns400WithValidationErrors() throws Exception {
        String requestJson = objectMapper.writeValueAsString(new ResendEmailRequest("email-invalido-sem-arroba"));

        mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.email").exists());

        verify(emailVerificationService, never()).resendEmailVerification(any());
    }

    @Test
    @DisplayName("[US22] Rotas de verificação e reenvio devem ser públicas e acessíveis sem JWT (não retornar 401)")
    void verificationRoutes_WithoutJwtToken_AccessibleWithoutReturning401() throws Exception {
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest("token-qualquer"))))
                .andExpect(status().isOk());

        mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResendEmailRequest("user@uefs.br"))))
                .andExpect(status().isOk());
    }
}
