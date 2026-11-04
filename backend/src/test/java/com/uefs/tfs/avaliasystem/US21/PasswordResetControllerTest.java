package com.uefs.tfs.avaliasystem.US21;

import com.uefs.tfs.avaliasystem.AvaliaSystemApplication;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.AuthController;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.PasswordResetService;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@ContextConfiguration(classes = AvaliaSystemApplication.class)
class PasswordResetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private PasswordResetService passwordResetService;

    @Test
    void shouldReturnSameRecoveryResponseForRegisteredAndUnregisteredEmails() throws Exception {
        String registeredEmailResponse = requestRecovery("registered@example.com");
        String unregisteredEmailResponse = requestRecovery("unregistered@example.com");

        org.junit.jupiter.api.Assertions.assertEquals(registeredEmailResponse, unregisteredEmailResponse);
        verify(passwordResetService).requestPasswordReset("registered@example.com");
        verify(passwordResetService).requestPasswordReset("unregistered@example.com");
    }

    @Test
    void shouldRejectRecoveryRequestWithInvalidEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldResetPasswordWhenRequestIsValid() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"valid-token","newPassword":"newPassword123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Senha redefinida com sucesso."));

        verify(passwordResetService).resetPassword("valid-token", "newPassword123");
    }

    @Test
    void shouldReturnBadRequestWhenResetTokenIsInvalid() throws Exception {
        doThrow(new IllegalArgumentException("Token inválido ou expirado."))
                .when(passwordResetService).resetPassword("invalid-token", "newPassword123");

        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"invalid-token","newPassword":"newPassword123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectResetRequestWithMissingFields() throws Exception {
        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"","newPassword":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    private String requestRecovery(String email) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/password/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists())
                .andReturn()
                .getResponse()
                .getContentAsString();
    }
}
