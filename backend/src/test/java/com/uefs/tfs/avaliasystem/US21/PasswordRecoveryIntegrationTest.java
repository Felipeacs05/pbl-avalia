// backend/src/test/java/com/uefs/tfs/avaliasystem/US21/PasswordRecoveryIntegrationTest.java
package com.uefs.tfs.avaliasystem.US21;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.dto.PasswordRecoveryRequest;
import com.uefs.tfs.avaliasystem.dto.PasswordResetRequest;
import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.PasswordResetTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public class PasswordRecoveryIntegrationTest {

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
        testUser.setEmail("joao@uefs.br");
        testUser.setPassword(passwordEncoder.encode("senhaAntiga123"));
        testUser.setTokenVersion(1); // Usado para invalidar sessões JWT antigas
        userRepository.save(testUser);
    }

    @Test
    void shouldReturnSameMessageForExistingAndNonExistingEmail_PreventEnumeration() throws Exception {
        // E-mail que NÃO existe no banco de dados
        PasswordRecoveryRequest invalidRequest = new PasswordRecoveryRequest();
        invalidRequest.setEmail("naoexiste@uefs.br");

        mockMvc.perform(post("/api/auth/password/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Se o e-mail estiver cadastrado, você receberá um link de recuperação."));

        // E-mail que EXISTE no banco de dados
        PasswordRecoveryRequest validRequest = new PasswordRecoveryRequest();
        validRequest.setEmail("joao@uefs.br");

        mockMvc.perform(post("/api/auth/password/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Se o e-mail estiver cadastrado, você receberá um link de recuperação."));
    }

    @Test
    void shouldResetPasswordSuccessfullyAndInvalidateSessions() throws Exception {
        PasswordResetToken resetToken = new PasswordResetToken(testUser, UUID.randomUUID().toString(), LocalDateTime.now().plusMinutes(30));
        tokenRepository.save(resetToken);

        PasswordResetRequest resetRequest = new PasswordResetRequest();
        resetRequest.setToken(resetToken.getToken());
        resetRequest.setNewPassword("novaSenhaForte456");

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Senha redefinida com sucesso."));

        User updatedUser = userRepository.findById(testUser.getId()).get();
        PasswordResetToken updatedToken = tokenRepository.findById(resetToken.getId()).get();

        assertTrue(passwordEncoder.matches("novaSenhaForte456", updatedUser.getPassword()), "A senha deve ter sido alterada.");
        assertTrue(updatedToken.isUsed(), "O token deve ser marcado como usado.");
        assertEquals(2, updatedUser.getTokenVersion(), "A versão do token do usuário deve ser incrementada para invalidar sessões anteriores.");
    }

    @Test
    void shouldRejectUsedToken() throws Exception {
        PasswordResetToken resetToken = new PasswordResetToken(testUser, UUID.randomUUID().toString(), LocalDateTime.now().plusMinutes(30));
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        PasswordResetRequest resetRequest = new PasswordResetRequest();
        resetRequest.setToken(resetToken.getToken());
        resetRequest.setNewPassword("novaSenhaForte456");

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Token inválido ou expirado."));
    }

    @Test
    void shouldRejectExpiredToken() throws Exception {
        PasswordResetToken resetToken = new PasswordResetToken(testUser, UUID.randomUUID().toString(), LocalDateTime.now().minusMinutes(5));
        tokenRepository.save(resetToken);

        PasswordResetRequest resetRequest = new PasswordResetRequest();
        resetRequest.setToken(resetToken.getToken());
        resetRequest.setNewPassword("novaSenhaForte456");

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Token inválido ou expirado."));
    }
}