package com.uefs.tfs.avaliasystem.US21;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.PasswordRecoveryRequest;
import com.uefs.tfs.avaliasystem.dto.PasswordResetRequest;
import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.PasswordResetTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestConfig
class PasswordRecoveryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User();
        testUser.setName("João Silva");
        testUser.setEmail("joaocarlosrodrigues307@gmail.com");
        testUser.setPassword(passwordEncoder.encode("senhaAntiga123"));
        testUser.setTokenVersion(1);
        testUser = userRepository.save(testUser);
    }

    @Test
    void shouldReturnSameMessageForExistingAndNonExistingEmailToPreventEnumeration() throws Exception {
        String recoveryUrl = "/api/v1/auth/password/recover";

        mockMvc.perform(post(recoveryUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasswordRecoveryRequest("naoexiste@uefs.br"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."));

        mockMvc.perform(post(recoveryUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasswordRecoveryRequest(testUser.getEmail()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."));
    }

    @Test
    void shouldResetPasswordSuccessfullyAndInvalidateSessions() throws Exception {
        PasswordResetToken resetToken = tokenRepository.save(new PasswordResetToken(
                testUser,
                UUID.randomUUID().toString(),
                Instant.now().plusSeconds(30 * 60)
        ));

        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasswordResetRequest(resetToken.getToken(), "novaSenhaForte456"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Senha redefinida com sucesso."));

        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        PasswordResetToken updatedToken = tokenRepository.findById(resetToken.getId()).orElseThrow();

        assertTrue(passwordEncoder.matches("novaSenhaForte456", updatedUser.getPassword()));
        assertTrue(updatedToken.isUsed());
        assertEquals(2, updatedUser.getTokenVersion());
    }

    @Test
    void shouldRejectUsedToken() throws Exception {
        PasswordResetToken resetToken = new PasswordResetToken(
                testUser,
                UUID.randomUUID().toString(),
                Instant.now().plusSeconds(30 * 60)
        );
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasswordResetRequest(resetToken.getToken(), "novaSenhaForte456"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));
    }

    @Test
    void shouldRejectExpiredToken() throws Exception {
        PasswordResetToken resetToken = tokenRepository.save(new PasswordResetToken(
                testUser,
                UUID.randomUUID().toString(),
                Instant.now().minusSeconds(5 * 60)
        ));

        mockMvc.perform(post("/api/v1/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PasswordResetRequest(resetToken.getToken(), "novaSenhaForte456"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));
    }
}
